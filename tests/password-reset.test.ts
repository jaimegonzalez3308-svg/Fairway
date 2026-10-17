import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  requestPasswordReset,
  updateRecoveredPassword,
} from "../lib/password-reset";
import { PasswordRecovery } from "../components/password-recovery";

const origin = "https://fairway-leon-golf.honeyring4.chatgpt.site";
test("el SDK solicita recuperación con correo limpio y destino de Fairway, y no oculta errores de entrega", async () => {
  const requests: { url: URL; body: Record<string, string> }[] = [];
  let fail = false;
  const client = createClient(
    "https://auth.example.invalid",
    "public-test-key",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: async (input, init) => {
          requests.push({
            url: new URL(String(input)),
            body: JSON.parse(String(init?.body)),
          });
          return Response.json(
            fail
              ? {
                  code: "email_address_not_authorized",
                  msg: "Email address not authorized",
                }
              : {},
            {
              status: fail ? 403 : 200,
              headers: { "x-supabase-api-version": "2024-01-01" },
            },
          );
        },
      },
    },
  );
  await assert.rejects(
    requestPasswordReset(client.auth, "bad-address", origin),
    /correo válido/,
  );
  assert.equal(requests.length, 0);
  await requestPasswordReset(client.auth, " golfer@example.com ", origin);
  assert.equal(requests[0].url.pathname, "/auth/v1/recover");
  assert.equal(
    requests[0].url.searchParams.get("redirect_to"),
    origin + "/?recovery=1",
  );
  assert.equal(requests[0].body.email, "golfer@example.com");
  fail = true;
  await assert.rejects(
    requestPasswordReset(client.auth, "golfer@example.com", origin),
    { code: "email_address_not_authorized" },
  );
});

test("guardar una contraseña exige coincidencia, respeta errores de sesión y solo envía la contraseña nueva", async () => {
  const updates: unknown[] = [];
  let failure: null | { code: string; message: string } = null;
  const auth = {
    updateUser: async (attributes: unknown) => {
      updates.push(attributes);
      return { data: { user: null }, error: failure };
    },
  } as unknown as Parameters<typeof updateRecoveredPassword>[0];
  await assert.rejects(
    updateRecoveredPassword(auth, "short", "short"),
    /10 caracteres/,
  );
  await assert.rejects(
    updateRecoveredPassword(auth, "long-password", "another-password"),
    /no coinciden/,
  );
  assert.equal(updates.length, 0);
  failure = { code: "session_not_found", message: "Session missing" };
  await assert.rejects(
    updateRecoveredPassword(auth, "long-password", "long-password"),
    { code: "session_not_found" },
  );
  failure = null;
  await updateRecoveredPassword(auth, "long-password", "long-password");
  assert.deepEqual(updates[1], { password: "long-password" });
});

test("el formulario de contraseña requiere sesión y un enlace sin errores, incluso con una sesión anterior", () => {
  const render = (signedIn: boolean, error: string | null, ready = true) =>
    renderToStaticMarkup(
      createElement(PasswordRecovery, {
        ready,
        signedIn,
        error,
        onDone() {},
        onExit() {},
      }),
    );
  const expired = render(true, "El enlace venció.");
  assert.doesNotMatch(expired, /type="password"/);
  assert.match(expired, /Enviar enlace de recuperación/);
  assert.doesNotMatch(render(false, null), /type="password"/);
  assert.doesNotMatch(render(true, null, false), /type="password"/);
  assert.equal((render(true, null).match(/type="password"/g) || []).length, 2);
});
