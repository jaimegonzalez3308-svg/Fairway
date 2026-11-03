import { AuthClient } from "@supabase/supabase-js";
import { registerPlugin } from "@capacitor/core";
import { authReturnError } from "./auth";

export const NATIVE_GOOGLE_CALLBACK = "com.fairway.app://auth/callback";
type AuthenticationSheet = {
  authenticate(options: {
    url: string;
  }): Promise<{ cancelled: true } | { cancelled: false; url: string }>;
};
const sheet = registerPlugin<AuthenticationSheet>("FairwayAuth");
type GoogleAuthClient = InstanceType<typeof AuthClient>;
export type NativeGoogleDependencies = {
  sheet: AuthenticationSheet;
  createAuth: (
    url: string,
    key: string,
  ) => Pick<
    GoogleAuthClient,
    "signInWithOAuth" | "exchangeCodeForSession" | "dispose"
  >;
};
const defaults: NativeGoogleDependencies = {
  sheet,
  // Keep this verifier in memory for this one sheet. Email confirmation,
  // recovery, website OAuth and the app's persisted session keep their setup.
  createAuth: (url, key) =>
    new AuthClient({
      url: new URL("/auth/v1", url).href,
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      flowType: "pkce",
      storageKey: "fairway-native-google",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    }),
};

export function nativeGoogleCode(callback: string) {
  const url = new URL(callback);
  const expected = new URL(NATIVE_GOOGLE_CALLBACK);
  if (
    url.protocol !== expected.protocol ||
    url.host !== expected.host ||
    url.pathname !== expected.pathname ||
    url.username ||
    url.password
  )
    throw new Error("El regreso de Google no es válido. Intenta de nuevo.");
  const error = authReturnError(url.hash, url.search);
  if (error) throw new Error(error);
  const codes = url.searchParams.getAll("code");
  if (codes.length !== 1 || !codes[0].trim() || url.hash)
    throw new Error(
      "No se recibió la confirmación de Google. Intenta de nuevo.",
    );
  return codes[0];
}

let pending: Promise<{ error: null }> | undefined;
export function signInWithNativeGoogle(
  url: string,
  key: string,
  destination: Pick<GoogleAuthClient, "setSession">,
  overrides: Partial<NativeGoogleDependencies> = {},
): Promise<{ error: null }> {
  if (pending) return pending;
  pending = performSignIn(url, key, destination, {
    ...defaults,
    ...overrides,
  }).finally(() => {
    pending = undefined;
  });
  return pending;
}

async function performSignIn(
  url: string,
  key: string,
  destination: Pick<GoogleAuthClient, "setSession">,
  deps: NativeGoogleDependencies,
): Promise<{ error: null }> {
  const auth = deps.createAuth(url, key);
  try {
    const result = await auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: NATIVE_GOOGLE_CALLBACK,
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    if (result.error) throw result.error;
    if (!result.data.url) throw new Error("No se pudo conectar con Google.");
    const authorize = new URL(result.data.url);
    if (
      authorize.protocol !== "https:" ||
      authorize.origin !== new URL(url).origin ||
      authorize.pathname !== "/auth/v1/authorize" ||
      authorize.searchParams.get("provider") !== "google" ||
      authorize.searchParams.get("redirect_to") !== NATIVE_GOOGLE_CALLBACK ||
      authorize.searchParams.get("code_challenge_method") !== "s256" ||
      !authorize.searchParams.get("code_challenge")
    )
      throw new Error("No se pudo preparar el acceso seguro con Google.");
    const callback = await deps.sheet.authenticate({ url: authorize.href });
    if (callback.cancelled) return { error: null };
    const exchanged = await auth.exchangeCodeForSession(
      nativeGoogleCode(callback.url),
    );
    if (exchanged.error) throw exchanged.error;
    if (!exchanged.data.session)
      throw new Error("No se pudo confirmar tu sesión. Intenta de nuevo.");
    const { access_token, refresh_token } = exchanged.data.session;
    // Only verified tokens enter the existing client and its auth-state flow.
    const saved = await destination.setSession({ access_token, refresh_token });
    if (saved.error) throw saved.error;
    return { error: null };
  } finally {
    await auth.dispose();
  }
}
