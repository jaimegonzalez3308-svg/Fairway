import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Field } from "../components/ui";

test("los campos conectan etiqueta, ayuda y error sin perder descripciones existentes", () => {
  const markup = renderToStaticMarkup(
    createElement(Field, {
      label: "Correo",
      hint: "Usa el correo de tu cuenta.",
      error: "Escribe un correo válido.",
      children: createElement("input", {
        id: "email",
        type: "email",
        "aria-describedby": "existing-help",
      }),
    }),
  );
  assert.match(markup, /for="email"/);
  assert.match(markup, /<label for="email">Correo<\/label>/);
  assert.match(markup, /id="email"/);
  assert.match(markup, /aria-invalid="true"/);
  const descriptionIds = markup
    .match(/aria-describedby="([^"]+)"/)![1]
    .split(" ");
  assert.equal(descriptionIds[0], "existing-help");
  assert.equal(descriptionIds.length, 3);
  for (const id of descriptionIds.slice(1))
    assert.ok(markup.includes(`id="${id}"`));
});

test("cada campo conserva una etiqueta e identificador propios en el mismo formulario", () => {
  const markup = renderToStaticMarkup(
    createElement(
      "form",
      null,
      createElement(Field, {
        label: "Nombre",
        children: createElement("input", { name: "name" }),
      }),
      createElement(Field, {
        label: "Ciudad",
        children: createElement("input", { name: "city" }),
      }),
    ),
  );
  const ids = [...markup.matchAll(/<input[^>]*id="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(ids.length, 2);
  assert.notEqual(ids[0], ids[1]);
  for (const id of ids) assert.ok(markup.includes(`for="${id}"`));
  assert.doesNotMatch(markup, /aria-invalid="true"/);
});
