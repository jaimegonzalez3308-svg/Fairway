import { test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement, useState } from "react";
import { JSDOM } from "jsdom";

async function mount() {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://127.0.0.1/" });
  dom.window.document.documentElement.classList.add("native-ios");
  dom.window.matchMedia = (() => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    Event: dom.window.Event,
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 0),
    cancelAnimationFrame: (id: ReturnType<typeof setTimeout>) =>
      clearTimeout(id),
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
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(dom.window.document.getElementById("root")!);
  return {
    dom,
    root,
    async cleanup() {
      await act(async () => root.unmount());
      dom.window.close();
      for (const [key, d] of originals) {
        if (d) Object.defineProperty(globalThis, key, d);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

function touch(target: Element, type: string, x: number, y: number) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  const point = { clientX: x, clientY: y, target };
  Object.defineProperty(event, "touches", {
    value: type === "touchend" ? [] : [point],
  });
  Object.defineProperty(event, "changedTouches", { value: [point] });
  target.dispatchEvent(event);
}

test("a sheet closes when pulled down far enough, not on a short pull or inner scroll", async () => {
  const env = await mount();
  const { useSheetDrag } = await import("../lib/use-native-feel");
  let closed = 0;
  function Sheet() {
    const [el, setEl] = useState<HTMLDivElement | null>(null);
    useSheetDrag(true, el, () => closed++);
    return createElement(
      "div",
      { ref: setEl, id: "sheet" },
      createElement("div", { id: "list" }, "lista"),
    );
  }
  try {
    await act(async () => env.root.render(createElement(Sheet)));
    const sheet = env.dom.window.document.getElementById("sheet")!;
    const list = env.dom.window.document.getElementById("list")!;
    const pull = (target: Element, distance: number) => {
      touch(target, "touchstart", 100, 100);
      for (let y = 100; y <= 100 + distance; y += 20)
        touch(target, "touchmove", 100, y);
      touch(target, "touchend", 100, 100 + distance);
    };
    pull(sheet, 60);
    assert.equal(closed, 0, "short pull springs back");
    pull(sheet, 160);
    assert.equal(closed, 1, "long pull closes");
    Object.defineProperty(list, "scrollTop", { value: 40, configurable: true });
    pull(list, 200);
    assert.equal(closed, 1, "pulling a scrolled list scrolls instead");
  } finally {
    await env.cleanup();
  }
});

test("the tour does not grab focus when it appears, only after Siguiente", async () => {
  const env = await mount();
  const { NativeTour } = await import("../components/native-experience");
  const props = { onNext() {}, onSkip() {} };
  try {
    await act(async () =>
      env.root.render(createElement(NativeTour, { step: 0, ...props })),
    );
    const heading = env.dom.window.document.getElementById("native-tour-title");
    assert.notEqual(env.dom.window.document.activeElement, heading);
    await act(async () =>
      env.root.render(createElement(NativeTour, { step: 1, ...props })),
    );
    assert.equal(
      env.dom.window.document.activeElement,
      env.dom.window.document.getElementById("native-tour-title"),
    );
    assert.equal(
      env.dom.window.document.querySelector('[role="dialog"]'),
      null,
      "not a dialog, so edge-swipe back is unaffected",
    );
  } finally {
    await env.cleanup();
  }
});

test("header focus reveals controls and disabling scroll hiding keeps Back visible", async () => {
  const env = await mount();
  const { useHideHeaderOnScroll } = await import("../lib/use-native-feel");
  function Header({ enabled }: { enabled: boolean }) {
    useHideHeaderOnScroll(enabled, enabled ? "descubrir" : "comunidad");
    return createElement(
      "header",
      { className: "topbar" },
      createElement("button", null, "Volver"),
    );
  }
  const scroll = async (y: number) => {
    Object.defineProperty(env.dom.window, "scrollY", {
      value: y,
      configurable: true,
    });
    await act(async () => {
      env.dom.window.dispatchEvent(new env.dom.window.Event("scroll"));
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  };
  try {
    const html = env.dom.window.document.documentElement;
    await act(async () =>
      env.root.render(createElement(Header, { enabled: true })),
    );
    await scroll(200);
    assert.equal(html.classList.contains("native-header-hidden"), true);
    env.dom.window.document.querySelector("button")!.focus();
    assert.equal(html.classList.contains("native-header-hidden"), false);
    await act(async () =>
      env.root.render(createElement(Header, { enabled: false })),
    );
    await scroll(600);
    assert.equal(html.classList.contains("native-header-hidden"), false);
  } finally {
    await env.cleanup();
  }
});
