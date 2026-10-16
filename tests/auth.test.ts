import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authRedirectUrl,
  authErrorMessage,
  authReturnError,
  routeFromHash,
} from "../lib/auth";
const origin = "https://fairway-leon-golf.honeyring4.chatgpt.site";
test("confirmar el registro conserva el perfil compartido y rechaza destinos arbitrarios", () => {
  const id = "b1efb86c-4e02-4ad5-b942-0c4c7b48ebcb";
  assert.equal(
    authRedirectUrl(origin, false, "?golfista=" + id),
    origin + "/?golfista=" + id + "#amigos",
  );
  assert.equal(
    authRedirectUrl(origin, false, "?golfista=https://evil.example"),
    origin + "/",
  );
  assert.equal(
    authRedirectUrl(origin, true, "?golfista=" + id),
    origin + "/?recovery=1",
  );
});
test("confirmación y recuperación vuelven al mismo dominio público", () => {
  assert.equal(authRedirectUrl(origin), origin + "/");
  assert.equal(authRedirectUrl(origin, true), origin + "/?recovery=1");
  assert.equal(
    authRedirectUrl("http://localhost:3000"),
    "http://localhost:3000/",
  );
});
test("un enlace usado o vencido se explica sin reflejar texto arbitrario de la URL", () => {
  const result = authReturnError(
    "#error=access_denied&error_code=otp_expired&error_description=Untrusted+text",
  );
  assert.match(result!, /ya se utilizó o venció/);
  assert.match(result!, /inicia sesión/);
  assert.doesNotMatch(result!, /Untrusted/);
  assert.match(
    authReturnError("", "?error=access_denied&error_code=otp_expired")!,
    /confirmación/,
  );
});
test("un callback válido conserva sus tokens y no se interpreta como una pantalla", () => {
  const hash =
    "#access_token=secret-example&refresh_token=another-example&type=signup";
  assert.equal(authReturnError(hash), null);
  assert.equal(routeFromHash(hash, ["descubrir", "perfil"]), "descubrir");
  assert.equal(routeFromHash("#perfil", ["descubrir", "perfil"]), "perfil");
  assert.equal(
    routeFromHash("#inventado", ["descubrir", "perfil"]),
    "descubrir",
  );
});
test("errores de correo no confirmado y límites de envío ofrecen el siguiente paso", () => {
  assert.match(
    authErrorMessage({ code: "email_not_confirmed" }),
    /nuevo correo/,
  );
  assert.match(
    authErrorMessage({ code: "over_email_send_rate_limit" }),
    /Espera/,
  );
  assert.match(authErrorMessage({ status: 429 }), /Espera/);
});
