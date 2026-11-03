import { test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { NativeEntry, NativeSwipeRow } from "../components/native-shell";

test("onboarding has three steps, supports skipping and becomes a compact account entry on return", async () => {
  const dom = new JSDOM("<div id='root'></div>", {
    url: "https://local.test/",
  });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    localStorage: dom.window.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  const root = createRoot(dom.window.document.getElementById("root")!);
  const calls: string[] = [];
  const props = {
    onLogin: () => calls.push("login"),
    onSignup: () => calls.push("signup"),
    onClubs: () => calls.push("clubs"),
  };
  const buttons = () =>
    Array.from(
      dom.window.document.querySelectorAll<HTMLButtonElement>("button"),
    );
  const click = async (label: string) => {
    const button = buttons().find((button) =>
      button.textContent?.includes(label),
    );
    assert.ok(button, label);
    await act(async () => {
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };
  try {
    await act(async () => root.render(createElement(NativeEntry, props)));
    assert.match(dom.window.document.body.textContent || "", /1 DE 3/);
    await click("Continuar");
    assert.match(dom.window.document.body.textContent || "", /2 DE 3/);
    assert.equal(dom.window.document.activeElement?.tagName, "H1");
    await click("Continuar");
    assert.match(dom.window.document.body.textContent || "", /3 DE 3/);
    await click("Explorar clubes");
    assert.deepEqual(calls, ["clubs"]);
    await act(async () => root.render(null));
    await act(async () => root.render(createElement(NativeEntry, props)));
    assert.equal(
      dom.window.document.querySelector("h1")?.textContent,
      "Entra a Fairway",
    );
    assert.doesNotMatch(dom.window.document.body.textContent || "", /DE 3/);
    assert.ok(
      dom.window.document.querySelector('a[href="/legal/privacidad/"]'),
    );
    await click("Iniciar sesión");
    assert.deepEqual(calls, ["clubs", "login"]);
    dom.window.localStorage.clear();
    await act(async () => root.render(null));
    await act(async () => root.render(createElement(NativeEntry, props)));
    await click("Omitir y explorar");
    assert.deepEqual(calls, ["clubs", "login", "clubs"]);
    let reads = 0;
    await act(async () =>
      root.render(
        createElement(NativeSwipeRow, {
          onRead: async () => {
            reads++;
            return true;
          },
          children: createElement("button", null, "Abrir conversación"),
        }),
      ),
    );
    const options = dom.window.document.querySelector<HTMLButtonElement>(
      '[aria-label="Opciones de conversación"]',
    )!;
    await act(async () => options.click());
    assert.equal(options.getAttribute("aria-expanded"), "true");
    await click("Marcar como leída");
    assert.equal(reads, 1);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
