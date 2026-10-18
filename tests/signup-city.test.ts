import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createClient } from "@supabase/supabase-js";
import { initialSignupCity, saveInitialSignupCity } from "../lib/signup-city";
import { AuthForm } from "../components/forms";
import { GoogleOnboarding } from "../components/google-onboarding";
import type { FairwayData } from "../lib/use-fairway";

test("la pregunta de ciudad aparece en el alta por correo y Google, sin aparecer al iniciar sesión", () => {
  const data = {
    user: {
      user_metadata: { full_name: "Ana Golf", signup_city: "Querétaro" },
    },
  } as unknown as FairwayData;
  const signup = renderToStaticMarkup(
    createElement(AuthForm, { data, onDone() {}, initialMode: "signup" }),
  );
  const login = renderToStaticMarkup(
    createElement(AuthForm, { data, onDone() {}, initialMode: "login" }),
  );
  const google = renderToStaticMarkup(
    createElement(GoogleOnboarding, { data }),
  );
  for (const html of [signup, google]) {
    assert.match(html, /¿En qué ciudad sueles jugar\?/);
    assert.match(html, /Usar mi ubicación/);
    assert.match(html, /BigDataCloud/);
    assert.match(html, /name="city"/);
  }
  assert.match(google, /value="Querétaro"/);
  assert.doesNotMatch(login, /name="city"|Usar mi ubicación/);
});

test("la ciudad de registro se recupera tras confirmar el correo y nunca reemplaza un perfil editado", () => {
  const fresh = { city: "León", availability: [] };
  assert.equal(
    initialSignupCity(fresh, { signup_city: "  queretaro " }),
    "Querétaro",
  );
  for (const metadata of [
    {},
    { signup_city: null },
    { signup_city: " " },
    { signup_city: 42 },
    { signup_city: "x".repeat(81) },
    { signup_city: "Leon" },
  ])
    assert.equal(initialSignupCity(fresh, metadata), null);
  assert.equal(
    initialSignupCity(
      { city: "Silao", availability: [] },
      { signup_city: "Querétaro" },
    ),
    null,
  );
  assert.equal(
    initialSignupCity(
      { city: "León", availability: ["Sábado"] },
      { signup_city: "Querétaro" },
    ),
    null,
  );
});

test("el guardado inicial usa los permisos de perfiles y condiciones atómicas para no pisar ediciones concurrentes", async () => {
  let requests = 0;
  const client = createClient("https://example.supabase.co", "test-key", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (input, init) => {
        requests++;
        const url = new URL(String(input));
        assert.equal(url.pathname, "/rest/v1/profiles");
        assert.equal(init?.method, "PATCH");
        assert.equal(url.searchParams.get("id"), "eq.test-user");
        assert.equal(url.searchParams.get("city"), "eq.León");
        assert.equal(url.searchParams.get("availability"), "eq.{}");
        assert.deepEqual(JSON.parse(String(init?.body)), { city: "Querétaro" });
        return new Response(null, { status: 204 });
      },
    },
  });
  await saveInitialSignupCity(client, "test-user", "queretaro");
  assert.equal(requests, 1);
  await assert.rejects(saveInitialSignupCity(client, "test-user", " "));
  assert.equal(requests, 1);
});

test("los errores de guardado no se silencian para permitir reintentar la creación del perfil", async () => {
  const client = createClient("https://example.supabase.co", "test-key", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async () =>
        new Response(
          JSON.stringify({ code: "42501", message: "Permission denied" }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        ),
    },
  });
  await assert.rejects(
    saveInitialSignupCity(client, "test-user", "Silao"),
    (error: unknown) => (error as { code: string }).code === "42501",
  );
});
