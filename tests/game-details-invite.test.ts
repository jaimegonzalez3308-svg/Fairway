import { test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { JSDOM } from "jsdom";

test("manual invitations lock during submission and unlock after an error", async () => {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://127.0.0.1/" });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window, document: dom.window.document,
    navigator: dom.window.navigator, location: dom.window.location,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
    HTMLButtonElement: dom.window.HTMLButtonElement, Element: dom.window.Element,
    DocumentFragment: dom.window.DocumentFragment, Node: dom.window.Node,
    NodeFilter: dom.window.NodeFilter, Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent, MutationObserver: dom.window.MutationObserver,
    FormData: dom.window.FormData,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  const { createRoot } = await import("react-dom/client");
  const { GameDetails } = await import("../components/game-details");
  const root = createRoot(document.getElementById("root")!);
  let calls = 0;
  let finish!: (ok: boolean) => void;
  const data = {
    user: { id: "me" }, me: { id: "me", name: "Organizer" },
    profiles: [{ id: "ana", name: "Ana" }], conversations: [], myReviews: [],
    run: () => { calls++; return new Promise<boolean>((resolve) => { finish = resolve; }); },
  } as never;
  try {
    await act(async () => root.render(createElement(GameDetails, {
      game: {
        id: "game", host_id: "me", club_id: "club", starts_at: new Date(Date.now() + 86400000).toISOString(),
        holes: 18, capacity: 4, format: "Casual", kind: "social", privacy: "public",
        status: "open", participants: [{ user_id: "me", status: "confirmed" }],
        description: "Weekly group", access_conditions: "Club approval",
      },
      clubName: "Club", data, onClose() {}, onChat() {}, onReview() {},
    })));
    const form = document.querySelector("form")!;
    const button = form.querySelector<HTMLButtonElement>("button")!;
    const submit = () => form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    await act(async () => { submit(); submit(); });
    assert.equal(calls, 1);
    assert.equal(button.disabled, true);
    assert.equal(button.textContent, "Enviando invitación…");
    assert.equal(form.querySelector("select")!.disabled, true);
    await act(async () => finish(false));
    assert.equal(button.disabled, false);
    assert.equal(button.textContent, "Enviar invitación");
    await act(async () => submit());
    assert.equal(calls, 2, "a failed invitation can be tried again deliberately");
    await act(async () => finish(true));
    assert.equal(button.disabled, false);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
