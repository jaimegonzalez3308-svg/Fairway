import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  installNativeSupport,
  NATIVE_PAUSE,
  NATIVE_RESUME,
  type NativeSupportPlugins,
} from "../lib/native-support";

test("native resume, keyboard and VoiceOver state update independently and clean up late listeners", async () => {
  const dom = new JSDOM("<input aria-label='Message'>");
  const original = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
  })) {
    original.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  const callbacks = new Map<string, (value?: any) => void>();
  const removed: string[] = [];
  let resolveReader!: (state: { value: boolean }) => void;
  let resolveLate!: (handle: { remove: () => Promise<void> }) => void;
  const register =
    (group: string) => (event: string, fn: (value?: unknown) => void) => {
      callbacks.set(`${group}:${event}`, fn);
      if (event === "keyboardDidShow")
        return new Promise((resolve) => {
          resolveLate = resolve;
        });
      return Promise.resolve({
        async remove() {
          removed.push(`${group}:${event}`);
        },
      });
    };
  const events: string[] = [];
  dom.window.addEventListener(NATIVE_RESUME, () => events.push("resume"));
  dom.window.addEventListener(NATIVE_PAUSE, () => events.push("pause"));
  let stop: (() => void) | undefined;
  try {
    stop = installNativeSupport({
      app: { addListener: register("app") },
      keyboard: { addListener: register("keyboard") },
      screenReader: {
        addListener: register("reader"),
        isEnabled: () =>
          new Promise((resolve) => {
            resolveReader = resolve;
          }),
      },
    } as unknown as NativeSupportPlugins);
    callbacks.get("app:appStateChange")!({ isActive: false });
    callbacks.get("app:appStateChange")!({ isActive: true });
    assert.deepEqual(events, ["pause", "resume"]);
    callbacks.get("keyboard:keyboardWillShow")!({ keyboardHeight: 300 });
    const root = dom.window.document.documentElement;
    assert.equal(
      root.style.getPropertyValue("--native-keyboard-height"),
      "300px",
    );
    assert.equal(root.classList.contains("native-keyboard-open"), true);
    callbacks.get("keyboard:keyboardWillHide")!();
    assert.equal(root.classList.contains("native-keyboard-open"), false);
    callbacks.get("reader:stateChange")!({ value: true });
    resolveReader({ value: false });
    await Promise.resolve();
    assert.equal(root.dataset.nativeScreenReader, "true");
    stop();
    stop = undefined;
    assert.equal(root.dataset.nativeScreenReader, undefined);
    assert.equal(root.style.getPropertyValue("--native-keyboard-height"), "");
    resolveLate({
      async remove() {
        removed.push("late");
      },
    });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(removed.length, 5);
    callbacks.get("keyboard:keyboardWillShow")!({ keyboardHeight: 300 });
    assert.equal(root.style.getPropertyValue("--native-keyboard-height"), "");
  } finally {
    stop?.();
    dom.window.close();
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
