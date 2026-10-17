import { sharedProfileId } from "./profile-share";
export function authRedirectUrl(
  origin: string,
  recovery = false,
  search = "",
): string {
  const url = new URL(recovery ? "/?recovery=1" : "/", origin);
  const profile = sharedProfileId(search);
  if (!recovery && profile) {
    url.searchParams.set("golfista", profile);
    url.hash = "amigos";
  }
  return url.href;
}

export function authErrorMessage(error: {
  code?: string;
  message?: string;
  status?: number;
}): string {
  switch (error.code) {
    case "email_address_not_authorized":
      return "El servicio de correo todavía no permite enviar a esta dirección. El administrador debe configurar el correo de Fairway en Supabase. Puedes acceder con Google mientras tanto.";
    case "email_provider_disabled":
      return "El acceso por correo aún no está habilitado. Puedes acceder con Google.";
    case "same_password":
      return "Elige una contraseña diferente de la anterior.";
    case "weak_password":
      return "La contraseña no cumple los requisitos. Usa al menos 10 caracteres y evita contraseñas comunes.";
    case "session_not_found":
    case "session_expired":
      return "La sesión del enlace venció. Solicita otro correo de recuperación.";
    case "provider_disabled":
    case "unsupported_provider":
      return "El acceso con Google aún no está disponible. Puedes usar tu correo y contraseña.";
    case "access_denied":
      return "No se completó el acceso con Google. Puedes intentarlo de nuevo o usar tu correo y contraseña.";
    case "otp_expired":
      return "El enlace de correo ya se utilizó o venció. Si ya confirmaste tu cuenta, inicia sesión; si no, solicita un nuevo correo de confirmación.";
    case "email_not_confirmed":
      return "Confirma tu correo antes de iniciar sesión. Puedes solicitar un nuevo correo de confirmación aquí.";
    case "invalid_credentials":
      return "El correo o la contraseña no son correctos.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Se solicitaron demasiados correos o intentos. Espera unos minutos y vuelve a intentar.";
    case "user_already_exists":
      return "Esta cuenta ya existe. Inicia sesión o recupera tu contraseña.";
    default:
      if (error.status === 429)
        return "Espera unos minutos antes de volver a intentarlo.";
      return (
        error.message ||
        "No se pudo completar la autenticación. Intenta de nuevo."
      );
  }
}

export function authReturnError(hash: string, search = ""): string | null {
  for (const value of [hash.replace(/^#/, ""), search.replace(/^\?/, "")]) {
    const params = new URLSearchParams(value);
    if (params.has("error") || params.has("error_code")) {
      const code = params.get("error_code");
      if (params.get("error") === "access_denied" && !code)
        return authErrorMessage({ code: "access_denied" });
      if (code)
        return authErrorMessage({
          code,
          message:
            "No se pudo completar el acceso. Intenta iniciar sesión de nuevo.",
        });
      return "No se pudo completar el acceso. Intenta iniciar sesión de nuevo.";
    }
  }
  return null;
}

export function routeFromHash(
  hash: string,
  allowed: readonly string[],
  signedIn = false,
): string {
  const candidate = hash.replace(/^#/, "");
  if (signedIn && candidate === "inicio") return "descubrir";
  return allowed.includes(candidate) ? candidate : "descubrir";
}

// This identifies the intended screen; Supabase still verifies the email token.
export function isPasswordRecoveryReturn(hash: string, search = ""): boolean {
  return (
    new URLSearchParams(search.replace(/^\?/, "")).get("recovery") === "1" ||
    new URLSearchParams(hash.replace(/^#/, "")).get("type") === "recovery"
  );
}

export function passwordRecoveryError(error: string | null): string | null {
  return error
    ? "El enlace de recuperación venció, ya se utilizó o no es válido. Solicita uno nuevo y abre únicamente el correo más reciente."
    : null;
}

export function completedAuthReturnUrl(href: string, page: string): string {
  const url = new URL(href);
  for (const key of [
    "recovery",
    "error",
    "error_code",
    "error_description",
    "code",
  ])
    url.searchParams.delete(key);
  url.hash = page;
  return url.pathname + url.search + url.hash;
}
