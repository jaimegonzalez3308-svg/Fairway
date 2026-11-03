import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { appleJWT, verifyAppleToken } from "../_shared/apple-services.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const respond = (message: string, status: number) =>
  Response.json({ error: message }, { status, headers: cors });
function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error("Service not configured");
  return value;
}
Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: cors });
  if (request.method !== "POST") return respond("Método no permitido", 405);
  try {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
      return respond("Inicia sesión para continuar", 401);
    const db = createClient(
      required("SUPABASE_URL"),
      required("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const identity = await db.auth.getUser(auth.slice(7));
    if (identity.error || !identity.data.user)
      return respond("Sesión no válida", 401);
    const user = identity.data.user;
    const apple = user.identities?.find((value) => value.provider === "apple");
    const subject = apple?.identity_data?.sub;
    if (typeof subject !== "string")
      return respond("La cuenta no tiene esta identidad de Apple", 403);
    const ready = await db.rpc("native_service_status");
    if (ready.error || ready.data?.apple !== true)
      return respond(
        "La eliminación con Apple todavía no está disponible",
        503,
      );
    const raw = await request.text();
    if (raw.length > 8192) return respond("Solicitud no válida", 400);
    const body = JSON.parse(raw);
    if (
      body.confirmation !== "ELIMINAR" ||
      typeof body.code !== "string" ||
      body.code.length > 4096 ||
      typeof body.nonce !== "string" ||
      body.nonce.length < 32 ||
      body.nonce.length > 200
    )
      return respond(
        "Confirma la eliminación y vuelve a autenticarte con Apple",
        400,
      );
    const now = Math.floor(Date.now() / 1000);
    const clientId = required("APPLE_BUNDLE_ID");
    const clientSecret = await appleJWT(
      required("APPLE_SIGN_IN_PRIVATE_KEY"),
      required("APPLE_SIGN_IN_KEY_ID"),
      {
        iss: required("APPLE_TEAM_ID"),
        iat: now,
        exp: now + 300,
        aud: "https://appleid.apple.com",
        sub: clientId,
      },
    );
    const tokens = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: body.code,
        grant_type: "authorization_code",
      }),
    });
    if (!tokens.ok)
      return respond(
        "Apple no pudo confirmar tu identidad. Intenta de nuevo",
        403,
      );
    const verified = await tokens.json();
    if (
      typeof verified.id_token !== "string" ||
      typeof verified.refresh_token !== "string"
    )
      return respond("Confirmación incompleta de Apple", 403);
    try {
      await verifyAppleToken(verified.id_token, {
        subject,
        clientId,
        nonce: body.nonce,
        now,
      });
    } catch {
      return respond("La identidad de Apple no coincide con esta cuenta", 403);
    }
    const revoked = await fetch("https://appleid.apple.com/auth/revoke", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        token: verified.refresh_token,
        token_type_hint: "refresh_token",
      }),
    });
    if (!revoked.ok)
      return respond(
        "No se pudo desconectar Apple. Tu cuenta sigue disponible para reintentar",
        503,
      );
    // Fresh Apple identity + explicit confirmation precede every destructive step.
    for (const bucket of ["profile-images", "story-images"]) {
      for (let page = 0; page < 100; page++) {
        const files = await db.storage
          .from(bucket)
          .list(user.id, { limit: 100 });
        if (files.error) throw new Error("Storage unavailable");
        if (!files.data.length) break;
        const paths = files.data
          .filter((value) => value.name !== ".emptyFolderPlaceholder")
          .map((value) => `${user.id}/${value.name}`);
        if (!paths.length) break;
        const removed = await db.storage.from(bucket).remove(paths);
        if (removed.error) throw new Error("Storage unavailable");
        if (page === 99) throw new Error("Storage cleanup incomplete");
      }
    }
    const deleted = await db.auth.admin.deleteUser(user.id);
    if (deleted.error) throw new Error("Deletion incomplete");
    return Response.json({ deleted: true }, { headers: cors });
  } catch {
    return respond(
      "No se completó la eliminación. Algunas fotos pueden haberse eliminado; vuelve a intentar antes de cerrar sesión",
      503,
    );
  }
});
