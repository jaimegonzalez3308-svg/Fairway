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
