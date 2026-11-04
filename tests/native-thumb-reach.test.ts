import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { ThumbAction } from "../components/ui";

const css = readFileSync(new URL("../app/native-app.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const source = (file: string) =>
  readFileSync(new URL(`../components/${file}`, import.meta.url), "utf8");

// Every rule that names the thumb-reach classes must be scoped to the app.
function rulesFor(className: string) {
  return css
    .split("}")
    .map((block) => block.split("{")[0])
    .filter((selector) => selector?.includes(className));
}

test("screen main actions are explicitly marked for the bottom thumb zone", () => {
  const marked = [
    ["parties.tsx", "Crear party"],
    ["availability.tsx", "Armar partida"],
    ["fairway-app.tsx", "Registrar score"],
  ] as const;
  for (const [file, label] of marked) {
    const text = source(file);
    const at = text.indexOf(label);
    assert.ok(at > 0, `${label} exists`);
    const opening = text.lastIndexOf("<", text.lastIndexOf("onClick", at));
    assert.ok(text.startsWith("<ThumbAction", opening), `${label} uses ThumbAction`);
  }
  assert.equal(source("fairway-app.tsx").match(/<ThumbAction/g)?.length, 2);
});

test("sheet submits are explicitly marked, not matched by a generic selector", () => {
  assert.equal(source("forms.tsx").match(/className="native-sheet-action"/g)?.length, 3);
  assert.match(source("discovery-filters.tsx"), /button-row native-sheet-action/);
});

test("thumb-reach and consistency rules only apply in the installed iOS app", () => {
  for (const name of ["native-thumb-action", "native-sheet-action", "--nx-radius"]) {
    const selectors = rulesFor(name).filter((s) => !s.trim().startsWith("--"));
    for (const selector of selectors) {
      for (const part of selector.split(/,(?![^(]*\))/)) {
        if (!part.trim() || part.includes("--nx")) continue;
        assert.match(part, /html\.native-ios/, `unscoped: ${part.trim()}`);
      }
    }
  }
  assert.doesNotMatch(
    readFileSync(new URL("../app/globals.css", import.meta.url), "utf8"),
    /native-thumb-action|native-sheet-action/,
  );
});

test("the floating action steps aside for the keyboard and the tour", () => {
  assert.match(
    css,
    /html\.native-ios\.native-keyboard-open body > \.native-thumb-action,\s*html\.native-ios:has\(\.native-tour\) body > \.native-thumb-action \{\s*display: none;/,
  );
  assert.match(css, /html\.native-ios:has\(body > \.native-thumb-action\) \.native-app \.toast/);
});

async function renderThumbAction(native: boolean) {
  const dom = new JSDOM("<main><div id='heading'></div></main>", {
    url: "http://127.0.0.1/",
  });
  if (native) dom.window.document.documentElement.classList.add("native-ios");
  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    MutationObserver: dom.window.MutationObserver,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const previous = Object.fromEntries(
    Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const heading = dom.window.document.getElementById("heading")!;
  const root = createRoot(heading);
  let clicks = 0;
  await act(async () =>
    root.render(createElement(ThumbAction, { onClick: () => clicks++ }, "Crear party")),
  );
  const button = dom.window.document.querySelector("button.native-thumb-action");
  const result = {
    inHeading: heading.contains(button),
    bodyChild: button?.parentElement === dom.window.document.body,
    primary: button?.classList.contains("primary"),
    clicks: () => {
      (button as HTMLButtonElement).click();
      return clicks;
    },
  };
  const clicked = result.clicks();
  await act(async () => root.unmount());
  const removed = !dom.window.document.querySelector(".native-thumb-action");
  for (const [key, descriptor] of Object.entries(previous)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete (globalThis as Record<string, unknown>)[key];
  }
  return { ...result, clicked, removed };
}

test("ThumbAction stays in the heading on the website and moves to body in the app", async () => {
  const web = await renderThumbAction(false);
  assert.deepEqual([web.inHeading, web.bodyChild, web.primary, web.clicked, web.removed], [true, false, true, 1, true]);
  const app = await renderThumbAction(true);
  assert.deepEqual([app.inHeading, app.bodyChild, app.primary, app.clicked, app.removed], [false, true, true, 1, true]);
});
