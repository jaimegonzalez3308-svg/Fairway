import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";

const globals = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const nativeCss = readFileSync(
  new URL("../app/native-app.css", import.meta.url),
  "utf8",
);
const markup = `<div class="native-app"><main data-page="perfil"><div class="tabs spaced"><button>Publicaciones</button></div><div class="panel profile-info"><div class="info-grid"><div class="info-item"><small>Disponibilidad</small><strong>Lunes, Martes, Miércoles</strong></div><div class="info-item profile-card-duplicate"><small>Handicap</small><strong>0</strong></div></div></div></main></div>`;

function styles(htmlClass: string, attrs = "") {
  const dom = new JSDOM(
    `<html class="${htmlClass}" ${attrs}><head><style>${globals}</style><style>${nativeCss}</style></head><body>${markup}</body></html>`,
    { virtualConsole: new VirtualConsole() },
  );
  const get = (s: string) =>
    dom.window.getComputedStyle(dom.window.document.querySelector(s)!);
  return { get, close: () => dom.window.close() };
}

test("Información hides only the rows already in the profile card, in the app", () => {
  const app = styles("native-ios");
  assert.equal(app.get(".profile-card-duplicate").display, "none");
  assert.notEqual(
    app.get(".info-item:not(.profile-card-duplicate)").display,
    "none",
  );
  // Long availability wraps instead of being cut off.
  assert.notEqual(app.get(".info-item strong").whiteSpace, "nowrap");
  app.close();
  const web = styles("");
  assert.notEqual(web.get(".profile-card-duplicate").display, "none");
  web.close();
});

test("profile sections: segmented in the app, 2×2 and larger with accessibility on", () => {
  const app = styles("native-ios");
  assert.equal(app.get(".tabs.spaced").display, "grid");
  assert.equal(app.get(".tabs.spaced button").minHeight, "44px");
  app.close();
  const large = styles("native-ios", 'data-accessibility="true"');
  assert.equal(large.get(".tabs.spaced button").fontSize, "15px");
  large.close();
});
