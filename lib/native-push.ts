import { PushNotifications } from "@capacitor/push-notifications";
import type { PluginListenerHandle } from "@capacitor/core";
import { NativeDevice } from "./native-device";
import { supabase } from "./supabase";
import { applyNativeLink } from "./native-links";
import { nativeOnline } from "./native-network";

const registrationKey = "push.registration.v1";
type Registration = {
  installation: string;
  secret: string;
  userId: string;
  enabled: boolean;
  revoking: boolean;
};
async function registration(): Promise<Registration | null> {
  const { value } = await NativeDevice.get({ key: registrationKey });
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
const save = (value: Registration) =>
  NativeDevice.set({ key: registrationKey, value: JSON.stringify(value) });
let operation: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>) {
  const next = operation.then(fn, fn);
  operation = next.catch(() => {});
  return next;
}
async function revoke(row: Registration) {
  if (!nativeOnline())
    throw new Error("La desconexión se completará al reconectar.");
  // This capability-based RPC works after logout, without refreshing a session.
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  const result = await fetch(
    new URL(
      "/rest/v1/rpc/revoke_native_push",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        installation: row.installation,
        revocation_secret: row.secret,
      }),
    },
  );
  if (!result.ok)
    throw new Error(
      "Los avisos de la cuenta anterior siguen pendientes de desconectar. Intenta con conexión.",
    );
  await save({ ...row, enabled: false, revoking: false });
}
async function token() {
  const handles: PluginListenerHandle[] = [];
  let finish!: (value: string) => void;
  let fail!: (error: Error) => void;
  const result = new Promise<string>((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
  // Attach rejection handling before the native registration can respond.
  const completion = result.then(
    (value) => ({ value }),
    (error: Error) => ({ error }),
  );
  const timeout = setTimeout(
    () =>
      fail(
        new Error(
          "El iPhone no devolvió un registro de avisos. Intenta de nuevo con conexión.",
        ),
      ),
    15000,
  );
  try {
    handles.push(
      await PushNotifications.addListener("registration", ({ value }) =>
        finish(value.toLowerCase()),
      ),
    );
    handles.push(
      await PushNotifications.addListener("registrationError", () =>
        fail(
          new Error("No se pudo registrar este iPhone para recibir avisos."),
        ),
      ),
    );
    await PushNotifications.register();
    const value = await completion;
    if ("error" in value) throw value.error;
    return value.value;
  } finally {
    clearTimeout(timeout);
    await Promise.all(handles.map((handle) => handle.remove()));
  }
}

async function connect(userId: string, ask: boolean) {
  if (!nativeOnline())
    throw new Error(
      "Conéctate a internet para activar los avisos de esta cuenta.",
    );
  if (!supabase) throw new Error("Inicia sesión para activar los avisos.");
  const status = await NativeDevice.status();
  const readiness = await supabase.rpc("native_service_status");
  if (
    !status.pushConfigured ||
    readiness.error ||
    readiness.data?.push !== true
  )
    throw new Error(
      "Los avisos de este dispositivo todavía no están disponibles.",
    );
  let row = await registration();
  if (row?.revoking || (row && row.userId !== userId)) await revoke(row);
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === "prompt" && ask)
    permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted")
    throw new Error(
      "Los avisos están desactivados. Puedes activarlos en Ajustes del iPhone y volver a intentar.",
    );
  const deviceToken = await token();
  const session = await supabase.auth.getSession();
  if (session.error || session.data.session?.user.id !== userId)
    throw new Error(
      "Tu sesión cambió. Vuelve a activar los avisos en tu cuenta.",
    );
  row = row
    ? { ...row, userId, enabled: true, revoking: false }
    : {
        installation: crypto.randomUUID(),
        secret: crypto.randomUUID() + crypto.randomUUID(),
        userId,
        enabled: true,
        revoking: false,
      };
  // Persist the revocation capability before the server can accept this device.
  await save({ ...row, enabled: false, revoking: true });
  const result = await supabase.rpc("register_native_push", {
    installation: row.installation,
    device_token: deviceToken,
    revocation_secret: row.secret,
    apns_environment: status.pushEnvironment,
  });
  if (result.error)
    throw new Error(
      "No se pudo conectar este iPhone con tu cuenta. Intenta de nuevo.",
    );
  await save(row);
}
export function enableNativePush() {
  return serial(async () => {
    const session = await supabase?.auth.getSession();
    const userId = session?.data.session?.user.id;
    if (!userId) throw new Error("Inicia sesión para activar los avisos.");
    await connect(userId, true);
  });
}
export function disconnectNativePush() {
  return serial(async () => {
    const row = await registration();
    if (row) await save({ ...row, enabled: false, revoking: true });
    await PushNotifications.unregister().catch(() => {});
    await PushNotifications.removeAllDeliveredNotifications().catch(() => {});
    await NativeDevice.setBadge({ count: 0 }).catch(() => {});
    if (row && supabase) await revoke(row).catch(() => {});
  });
}
export async function installNativePush(userId: string) {
  let current = true;
  const handles: PluginListenerHandle[] = [];
  try {
    handles.push(
      await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (event) => {
          if (current && typeof event.notification.data?.url === "string")
            applyNativeLink(event.notification.data.url);
        },
      ),
    );
    handles.push(
      await PushNotifications.addListener("pushNotificationReceived", () => {
        if (current) {
          window.dispatchEvent(new Event("fairway:manual-refresh"));
          window.dispatchEvent(new Event("fairway:refresh-core"));
        }
      }),
    );
    void serial(async () => {
      const row = await registration();
      if (row && row.userId !== userId) {
        await save({ ...row, enabled: false, revoking: true });
        await PushNotifications.unregister().catch(() => {});
        await PushNotifications.removeAllDeliveredNotifications().catch(
          () => {},
        );
        if (supabase) await revoke(row);
      } else if (row?.revoking && supabase) await revoke(row);
      if (current && row?.enabled && row.userId === userId)
        await connect(userId, false);
    }).catch(() => {});
    return () => {
      current = false;
      for (const handle of handles) void handle.remove();
    };
  } catch {
    current = false;
    await Promise.all(handles.map((handle) => handle.remove()));
    return () => {};
  }
}
