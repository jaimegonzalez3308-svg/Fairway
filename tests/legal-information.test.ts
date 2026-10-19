import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LegalDocument } from "../components/legal-document";
import { AuthForm, ProfileForm } from "../components/forms";
import { GoogleOnboarding } from "../components/google-onboarding";
import { demoMe, clubs } from "../lib/demo";
import type { FairwayData } from "../lib/use-fairway";

const data = {
  user: { user_metadata: { full_name: "Ana Golf" } },
  me: demoMe,
  clubs,
} as unknown as FairwayData;
test("privacidad presenta el contacto confirmado y hace visible el domicilio pendiente, sin inventarlo", () => {
  const html = renderToStaticMarkup(
    createElement(LegalDocument, { document: "privacidad" }),
  );
  assert.match(html, /Jaime Gonzalez Alvarez y Rodrigo Calderon Knight/);
  assert.match(html, /href="mailto:fairway.rj@gmail.com"/);
  assert.match(html, /falta publicar el domicilio de contacto/);
  assert.match(html, /elegir la ciudad manualmente/);
});
test("correo y Google permiten leer privacidad y términos antes del consentimiento obligatorio sin perder el formulario", () => {
  for (const html of [
    renderToStaticMarkup(
      createElement(AuthForm, { data, onDone() {}, initialMode: "signup" }),
    ),
    renderToStaticMarkup(createElement(GoogleOnboarding, { data })),
  ]) {
    assert.match(html, /type="checkbox"[^>]*required=""/);
    for (const id of ["privacidad", "terminos"])
      assert.match(
        html,
        new RegExp(`href="/legal/${id}/" target="_blank" rel="noreferrer"`),
      );
    assert.match(html, /nueva pestaña/);
    assert.doesNotMatch(html, /privacidad en Ajustes/);
  }
});
test("los perfiles nuevos no solicitan género u ocupación y los existentes conservan la opción de eliminarlos", () => {
  const fresh = renderToStaticMarkup(
    createElement(ProfileForm, { data, onDone() {} }),
  );
  assert.doesNotMatch(
    fresh,
    /name="gender"|name="occupation"|Eliminar estos datos/,
  );
  const existing = renderToStaticMarkup(
    createElement(ProfileForm, {
      data: {
        ...data,
        me: { ...demoMe, occupation: "Arquitecta", gender: "Mujer" },
      },
      onDone() {},
    }),
  );
  assert.match(existing, /Arquitecta/);
  assert.match(existing, /Eliminar estos datos al guardar/);
  assert.doesNotMatch(existing, /Se eliminarán cuando guardes/);
});
