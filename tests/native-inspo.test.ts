import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM, VirtualConsole } from "jsdom";
import { DiscoveryEmpty, PhotoStack } from "../components/discovery-empty";

const css = readFileSync(
  new URL("../app/native-app.css", import.meta.url),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");
const noop = () => {};

test("the photo stack is decorative and reuses one course photo", () => {
  const html = renderToStaticMarkup(createElement(PhotoStack));
  assert.match(html, /^<span class="native-photo-stack" aria-hidden="true">/);
  assert.equal(html.match(/<img /g)?.length, 3);
  assert.equal(new Set(html.match(/src="[^"]+"/g)).size, 1);
  assert.equal(html.match(/alt=""/g)?.length, 3);
});

test("the empty deck shows the stack only when given, keeping its actions", () => {
  const props = {
    hasProfiles: true,
    exhausted: true,
    onReset: noop,
    onCreate: noop,
  };
  const web = renderToStaticMarkup(createElement(DiscoveryEmpty, props));
  const app = renderToStaticMarkup(
    createElement(DiscoveryEmpty, {
      ...props,
      illustration: createElement(PhotoStack),
    }),
  );
  assert.doesNotMatch(web, /native-photo-stack/);
  assert.match(app, /native-photo-stack/);
  for (const html of [web, app]) assert.match(html, /Crear una partida/);
});

test("party avatar stacks: hidden on web, a row in the app, seat count still spoken", () => {
  const globals = readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const native = readFileSync(
    new URL("../app/native-app.css", import.meta.url),
    "utf8",
  );
  for (const app of [false, true]) {
    const dom = new JSDOM(
      `<html class="${app ? "native-ios" : ""}"><head><style>${globals}</style><style>${native}</style></head><body><div class="native-app"><article class="party-card"><div class="party-card-seats"><div class="party-avatar-stack" aria-hidden="true"><span class="party-small-avatar">A</span></div><div class="party-seat-icons" aria-label="1 de 4 jugadores confirmados"></div><span><strong>1/4</strong></span></div></article></div></body></html>`,
      { virtualConsole: new VirtualConsole() },
    );
    const { document } = dom.window;
    const style = (selector: string) =>
      dom.window.getComputedStyle(document.querySelector(selector)!);
    const stack = style(".party-avatar-stack");
    const seats = style(".party-seat-icons");
    if (!app) {
      assert.equal(stack.display, "none");
      assert.notEqual(seats.position, "absolute");
    } else {
      assert.equal(stack.display, "inline-flex");
      assert.equal(stack.flexDirection, "row");
      // Visually hidden, not display:none, so VoiceOver keeps the label.
      assert.equal(seats.position, "absolute");
      assert.notEqual(seats.display, "none");
    }
    dom.window.close();
  }
});

test("the floating tab bar stays below the 84px line used by toasts and actions", () => {
  const rule = css
    .split("}")
    .filter(
      (b) =>
        /html\.native-ios \.native-tab-bar \{/.test(b) &&
        /bottom: \d+px/.test(b),
    )
    .pop()!;
  const bottom = Number(rule.match(/bottom: (\d+)px/)![1]);
  const height = Number(rule.match(/min-height: (\d+)px/)![1]);
  assert.ok(bottom + height <= 84, `${bottom}+${height}`);
});

test("frosted glass covers bars and menus in the app, with opaque fallbacks", () => {
  const glass = (html: string, extra = "") => {
    const globals = readFileSync(
      new URL("../app/globals.css", import.meta.url),
      "utf8",
    );
    const native = readFileSync(
      new URL("../app/native-app.css", import.meta.url),
      "utf8",
    );
    const dom = new JSDOM(
      `<html class="${html}" ${extra}><head><style>${globals}</style><style>${native}</style></head><body><div class="native-app"><header class="topbar"></header></div><nav class="native-tab-bar"></nav><div class="modal"></div></body></html>`,
      { virtualConsole: new VirtualConsole() },
    );
    const style = (s: string) =>
      dom.window.getComputedStyle(dom.window.document.querySelector(s)!);
    const result = {
      modal: style(".modal").getPropertyValue("backdrop-filter"),
    };
    dom.window.close();
    return result;
  };
  // Sheets never become translucent.
  assert.equal(glass("native-ios").modal, "");
  for (const block of native().split("}")) {
    const selector = block.split("{").slice(-2, -1)[0] ?? "";
    if (
      /\.modal(?!-overlay)\b/.test(selector) &&
      !selector.includes(".modal-overlay")
    )
      assert.doesNotMatch(
        block,
        /--nx-glass|backdrop-filter: (?!none)/,
        selector.trim(),
      );
  }
  // Glass is strong enough for secondary labels.
  const alpha = Number(
    native().match(/--nx-glass: rgb\(255 251 242 \/ ([\d.]+)\)/)![1],
  );
  assert.ok(alpha >= 0.8, `glass alpha ${alpha}`);
  // Visible secondary ink over glass: tab labels and the header subtitle.
  assert.match(
    native(),
    /\.native-tab-bar button:not\(\[aria-current="page"\]\),\s*html\.native-ios \.native-app \.topbar \.breadcrumb > strong \{\s*color: #3f4d3d;/,
  );
  // The drawer scrim only blurs while visible.
  assert.match(
    native(),
    /\.sidebar-scrim\.visible,\s*html\.native-ios \.modal-overlay \{\s*background: #193d2f47;/,
  );
  // Source checks for what JSDOM cannot evaluate (@supports / media queries).
  assert.match(
    native(),
    /@supports \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/,
  );
  assert.match(
    native(),
    /@media \(prefers-reduced-transparency: reduce\), \(prefers-contrast: more\)/,
  );
  assert.match(
    native(),
    /html\.native-ios\[data-accessibility="true"\] \.native-tab-bar,/,
  );
  for (const block of native()
    .split("}")
    .filter((b) => b.includes("var(--nx-glass"))) {
    const selector = block.split("{").slice(-2, -1)[0] ?? "";
    for (const part of selector.split(/,(?![^(]*\))/))
      if (part.trim()) assert.match(part, /html\.native-ios/, part.trim());
  }
});

function native() {
  return readFileSync(
    new URL("../app/native-app.css", import.meta.url),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, "");
}

test("club cards become photo covers only in the app; the website keeps its layout", () => {
  const globals = readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const nativeCss = readFileSync(
    new URL("../app/native-app.css", import.meta.url),
    "utf8",
  );
  for (const app of [false, true]) {
    const dom = new JSDOM(
      `<html class="${app ? "native-ios" : ""}"><head><style>${globals}</style><style>${nativeCss}</style></head><body><div class="native-app"><div class="club-grid"><article class="panel club-card"><div class="club-photo"><span class="badge">Datos verificados</span><span class="club-photo-caption">Imagen ilustrativa · No representa este club</span></div><div class="club-content"><span class="eyebrow">LEÓN</span><h2>Club</h2><p class="muted">3 perfiles</p></div></article></div></div></body></html>`,
      { virtualConsole: new VirtualConsole() },
    );
    const style = (s: string) =>
      dom.window.getComputedStyle(dom.window.document.querySelector(s)!);
    assert.equal(style(".club-content").display, app ? "contents" : "block");
    assert.equal(style(".club-card").display, app ? "grid" : "block");
    // The honest caption is never removed from the accessibility tree.
    assert.notEqual(style(".club-photo-caption").display, "none");
    dom.window.close();
  }
});
