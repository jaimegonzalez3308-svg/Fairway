import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act, createElement, useState } from "react";

test("Escape closes a dialog and returns keyboard focus to its opener", async () => {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://127.0.0.1/" });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLButtonElement: dom.window.HTMLButtonElement,
    Element: dom.window.Element,
    DocumentFragment: dom.window.DocumentFragment,
    Node: dom.window.Node,
    NodeFilter: dom.window.NodeFilter,
    Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent,
    MutationObserver: dom.window.MutationObserver,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  // Radix selects layout effects when it is imported into a DOM environment.
  const { Modal } = await import("../components/ui");
  const { createRoot } = await import("react-dom/client");
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  function Example() {
    const [open, setOpen] = useState(false);
    return createElement(
      "main",
      { id: "main-content", tabIndex: -1 },
      createElement(
        "button",
        { onClick: () => setOpen(true) },
        "Open preferences",
      ),
      open &&
        createElement(Modal, {
          title: "Preferences",
          onClose: () => setOpen(false),
          children: createElement("input", { "aria-label": "Example field" }),
        }),
    );
  }
  try {
    await act(async () => root.render(createElement(Example)));
    const opener = container.querySelector("button")!;
    opener.getClientRects = () =>
      [{ width: 80, height: 44 }] as unknown as DOMRectList;
    opener.focus();
    await act(async () => opener.click());
    assert.ok(dom.window.document.querySelector('[role="dialog"]'));
    await act(async () => {
      dom.window.document.activeElement!.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
        }),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    assert.equal(dom.window.document.querySelector('[role="dialog"]'), null);
    assert.equal(dom.window.document.activeElement, opener);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
