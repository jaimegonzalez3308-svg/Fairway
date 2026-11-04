import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act, createElement, useState } from "react";

test("a sheet that navigates away does not hand focus back to its opener", async () => {
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
  const { Modal } = await import("../components/ui");
  const { createRoot } = await import("react-dom/client");
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  let leaving = false;
  function Example() {
    const [open, setOpen] = useState(false);
    return createElement(
      "main",
      { id: "main-content", tabIndex: -1 },
      createElement("button", { onClick: () => setOpen(true) }, "Bell"),
      createElement("h1", { id: "destination", tabIndex: -1 }, "Partidas"),
      open &&
        createElement(Modal, {
          title: "Notificaciones",
          onClose: () => setOpen(false),
          shouldReturnFocus: () => !leaving,
          children: createElement(
            "button",
            {
              id: "go",
              onClick: () => {
                leaving = true;
                setOpen(false);
              },
            },
            "Ir a Partidas",
          ),
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
    await act(async () =>
      (dom.window.document.getElementById("go") as HTMLButtonElement).click(),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    assert.equal(dom.window.document.querySelector('[role="dialog"]'), null);
    // Focus is not handed back to the bell; the page's own focus effect
    // (fairway-app) then moves it to the destination screen.
    assert.notEqual(dom.window.document.activeElement, opener);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
