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
      if (code)
        return authErrorMessage({
          code,
          message:
            "No se pudo validar el enlace de correo. Solicita uno nuevo o intenta iniciar sesión.",
        });
      return "No se pudo validar el enlace de correo. Solicita uno nuevo o intenta iniciar sesión.";
    }
  }
  return null;
}

export function routeFromHash(
  hash: string,
  allowed: readonly string[],
): string {
  const candidate = hash.replace(/^#/, "");
  return allowed.includes(candidate) ? candidate : "descubrir";
}
