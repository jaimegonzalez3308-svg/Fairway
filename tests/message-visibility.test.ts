import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { observeMessageVisibility } from "../lib/message-visibility";
import { NATIVE_RESUME } from "../lib/native-support";

test("read receipts require an intersecting message and a visible, focused window; cleanup stops them", (t) => {
  const dom = new JSDOM(
    '<div class="chat-messages"><div id="message">Hola</div></div>',
    { pretendToBeVisual: true },
  );
  t.after(() => dom.window.close());
  let callback!: IntersectionObserverCallback;
  let hidden = false;
  let focused = true;
  let disconnected = false;
  let reads = 0;
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    IntersectionObserver: class {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe() {}
      disconnect() {
        disconnected = true;
      }
    },
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  t.after(() => {
    for (const [key, value] of originals) {
      if (value) Object.defineProperty(globalThis, key, value);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  Object.defineProperty(dom.window.document, "hidden", { get: () => hidden });
  dom.window.document.hasFocus = () => focused;
  const stop = observeMessageVisibility(
    dom.window.document.getElementById("message")!,
    () => {
      reads++;
    },
  );
  const intersect = (visible: boolean) =>
    callback(
      [
        {
          isIntersecting: visible,
          intersectionRatio: visible ? 1 : 0,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );
  hidden = true;
  intersect(true);
  assert.equal(reads, 0);
  hidden = false;
  focused = false;
  dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));
  assert.equal(reads, 0);
  focused = true;
  dom.window.dispatchEvent(new dom.window.Event("focus"));
  assert.equal(reads, 1);
  intersect(false);
  dom.window.dispatchEvent(new dom.window.Event(NATIVE_RESUME));
  assert.equal(reads, 1);
  intersect(true);
  assert.equal(reads, 2);
  stop();
  assert.equal(disconnected, true);
  intersect(true);
  dom.window.dispatchEvent(new dom.window.Event("focus"));
  assert.equal(reads, 2);
});
