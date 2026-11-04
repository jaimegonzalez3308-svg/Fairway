import { test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { JSDOM } from "jsdom";
import { SwipeDeck } from "../components/swipe-deck";
import { demoProfiles } from "../lib/demo";

for (const native of [false, true]) {
  test(`short player-card drags commit once and show readiness in ${native ? "iOS" : "web"} mode`, async () => {
    const dom = new JSDOM("<div id='root'></div>");
    if (native) dom.window.document.documentElement.classList.add("native-ios");
    dom.window.matchMedia = (() => ({
      matches: true,
    })) as unknown as typeof window.matchMedia;
    const originals = new Map<string, PropertyDescriptor | undefined>();
    for (const [key, value] of Object.entries({
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      HTMLElement: dom.window.HTMLElement,
      IS_REACT_ACT_ENVIRONMENT: true,
    })) {
      originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
      Object.defineProperty(globalThis, key, { value, configurable: true });
    }
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(dom.window.document.getElementById("root")!);
    const decisions: string[] = [];
    function pointer(target: Element, type: string, dx: number, dy: number) {
      const event = new dom.window.Event(type, { bubbles: true, cancelable: true });
      for (const [key, value] of Object.entries({
        pointerId: 1, isPrimary: true, button: 0,
        clientX: 200 + dx, clientY: 200 + dy,
      })) Object.defineProperty(event, key, { value });
      target.dispatchEvent(event);
    }
    function card() {
      const element = dom.window.document.querySelector<HTMLElement>(".swipe-card")!;
      let captured = false;
      element.getBoundingClientRect = () => ({ width: 360 }) as DOMRect;
      element.setPointerCapture = () => { captured = true; };
      element.hasPointerCapture = () => captured;
      element.releasePointerCapture = () => { captured = false; };
      return element;
    }
    async function drag(dx: number, dy: number, cancel = false) {
      const target = card();
      await act(async () => pointer(target, "pointerdown", 0, 0));
      // Keep these deliberately slow: distance alone must be enough to commit.
      await new Promise((resolve) => setTimeout(resolve, 180));
      await act(async () => pointer(target, "pointermove", dx, dy));
      if (Math.abs(dx) === 60 && !cancel) {
        assert.equal(target.querySelector<HTMLElement>(dx > 0 ? ".swipe-stamp-like" : ".swipe-stamp-pass")!.style.opacity, "1");
        assert.equal(decisions.length, dx > 0 ? 0 : 1, "moving alone never submits");
      }
      await act(async () => {
        pointer(target, cancel ? "pointercancel" : "pointerup", dx, dy);
        await new Promise((resolve) => setTimeout(resolve, 5));
      });
    }
    try {
      await act(async () => root.render(createElement(SwipeDeck, {
        profiles: demoProfiles.slice(0, 3),
        async onDecide(_id, choice) { decisions.push(choice); return true; },
        renderCard(profile) { return createElement("article", null, profile.name); },
        empty: createElement("p", null, "Fin"),
      })));
      await drag(20, 2);
      await drag(50, 100);
      await drag(60, 2, true);
      assert.deepEqual(decisions, [], "small, vertical and cancelled drags do nothing");
      await drag(60, 8);
      await drag(-60, 8);
      assert.deepEqual(decisions, ["like", "pass"]);
      assert.match(dom.window.document.body.textContent!, /1 por descubrir/);
    } finally {
      await act(async () => root.unmount());
      dom.window.close();
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    }
  });
}
