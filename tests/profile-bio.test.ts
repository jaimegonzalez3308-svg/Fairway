import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileBio } from "../components/profile-bio";
import { ProfileBioEditor } from "../components/profile-bio-editor";
import { profileSchema } from "../lib/profile-validation";

test("la biografía vacía tiene una acción clara para su propietario y no inventa texto para otros perfiles", () => {
  const own = renderToStaticMarkup(
    createElement(ProfileBio, { bio: "", onEdit() {} }),
  );
  assert.match(own, /Descripción/);
  assert.match(own, /Añadir descripción/);
  assert.equal(
    renderToStaticMarkup(createElement(ProfileBio, { bio: "  " })),
    "",
  );
  assert.match(
    renderToStaticMarkup(
      createElement(ProfileBio, { bio: "Me gustan los 9 hoyos", onEdit() {} }),
    ),
    /Editar descripción/,
  );
});

test("la biografía muestra saltos de línea como texto y escapa HTML", () => {
  const html = renderToStaticMarkup(
    createElement(ProfileBio, {
      bio: "Sábados, 9 hoyos.\n<script>alert(1)</script>",
    }),
  );
  assert.match(
    html,
    /Sábados, 9 hoyos\.\n&lt;script&gt;alert\(1\)&lt;\/script&gt;/,
  );
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /Editar descripción/);
});

test("el editor mantiene el texto y expone su límite, contador y privacidad", () => {
  const html = renderToStaticMarkup(
    createElement(ProfileBioEditor, {
      initialBio: "Hola",
      async onSave() {
        return true;
      },
      onDone() {},
    }),
  );
  assert.match(html, /<textarea[^>]*maxLength="500"/i);
  assert.match(html, />Hola<\/textarea>/);
  assert.match(html, /4\/500 caracteres/);
  assert.match(html, /Visible para quienes puedan ver tu perfil/);
  assert.match(html, /Guardar descripción/);
  assert.match(html, /Cancelar/);
});

test("la validación permite borrar o guardar 500 caracteres y rechaza superar el límite", () => {
  assert.equal(profileSchema.shape.bio.parse(""), "");
  assert.equal(profileSchema.shape.bio.parse("x".repeat(500)).length, 500);
  assert.equal(
    profileSchema.shape.bio.safeParse("x".repeat(501)).success,
    false,
  );
});
