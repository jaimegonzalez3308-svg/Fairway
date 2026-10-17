import { createClient } from "@supabase/supabase-js";
import { authReturnError, isPasswordRecoveryReturn } from "./auth";
// Capture callback intent before the SDK consumes and removes the URL fragment.
// No credentials or tokens are retained here.
export const initialAuthReturn =
  typeof window === "undefined"
    ? { recovery: false, error: null }
    : {
        recovery: isPasswordRecoveryReturn(location.hash, location.search),
        error: authReturnError(location.hash, location.search),
      };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;

export async function signInWithGoogle(redirectTo: string) {
  if (!supabase || !url || !key)
    throw new Error("La conexión aún no está configurada.");
  // Evita abandonar Fairway hacia una página de error si falta activar el proveedor.
  const response = await fetch(new URL("/auth/v1/settings", url), {
    headers: { apikey: key },
  });
  if (!response.ok) throw new Error("No se pudo conectar. Intenta de nuevo.");
  const settings = await response.json();
  if (settings.external?.google !== true) throw { code: "provider_disabled" };
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, queryParams: { prompt: "select_account" } },
  });
}
