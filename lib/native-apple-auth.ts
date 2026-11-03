import { registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { supabase } from "./supabase";
import { NATIVE_RESUME } from "./native-support";

export type AppleCredential = {
  cancelled: false;
  identityToken: string;
  authorizationCode: string;
  nonce: string;
  name: string;
};
export const NativeApple = registerPlugin<{
  authorize(): Promise<AppleCredential | { cancelled: true }>;
  credentialState(options: { user: string }): Promise<{ revoked: boolean }>;
  addListener(
    event: "credentialRevoked",
    callback: () => void,
  ): Promise<PluginListenerHandle>;
}>("FairwayApple");
let pending: Promise<void> | undefined;
export function signInWithApple() {
  if (pending) return pending;
  pending = signIn().finally(() => {
    pending = undefined;
  });
  return pending;
}

export async function installAppleSession(subject: string) {
  let current = true;
  const check = async () => {
    try {
      const state = await NativeApple.credentialState({ user: subject });
      if (
        current &&
        state.revoked &&
        !document.documentElement.hasAttribute("data-apple-deleting")
      )
        await supabase?.auth.signOut({ scope: "local" });
    } catch {
      /* Offline checks must not destroy a valid local session. */
    }
  };
  const handle = await NativeApple.addListener(
    "credentialRevoked",
    () => void check(),
  );
  window.addEventListener(NATIVE_RESUME, check);
  void check();
  return () => {
    current = false;
    window.removeEventListener(NATIVE_RESUME, check);
    void handle.remove();
  };
}
async function signIn() {
  if (!supabase) throw new Error("La conexión aún no está configurada.");
  const { data: ready, error: setupError } = await supabase.rpc(
    "native_service_status",
  );
  if (setupError || ready?.apple !== true)
    throw new Error(
      "El acceso con Apple todavía no está disponible. Puedes usar Google o tu correo.",
    );
  const credential = await NativeApple.authorize();
  if (credential.cancelled) return;
  const result = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: credential.nonce,
  });
  if (result.error) throw result.error;
  // Apple sends the name only once. Keep it for the age/consent onboarding.
  if (credential.name && !result.data.user.user_metadata.full_name) {
    await supabase.auth.updateUser({ data: { full_name: credential.name } });
  }
}
