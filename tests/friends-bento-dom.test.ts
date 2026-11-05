import { test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { JSDOM } from "jsdom";

test("friends hub tiles open their tabs and focus the search (app only)", async () => {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://127.0.0.1/" });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    location: dom.window.location,
    localStorage: dom.window.localStorage,
    HTMLElement: dom.window.HTMLElement,
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
  const { Friends } = await import("../components/friends");
  const person = (id: string, name: string) => ({ id, name, city: "León", photo: "" });
  const friends = {
    relations: [
      { id: "r1", requester_id: "me", recipient_id: "f1", status: "accepted" },
      { id: "r2", requester_id: "p1", recipient_id: "me", status: "pending" },
    ],
    people: [person("f1", "Luis Pérez"), person("p1", "Ana López")],
    loading: false,
    error: "",
    available: true,
    busy: null,
    refresh: async () => {},
    request: async () => true,
    respond: async () => true,
  };
  const data = {
    user: { id: "me" },
    me: { id: "me", name: "Rodrigo C", photo: "" },
  };
  const root = createRoot(dom.window.document.getElementById("root")!);
  const render = (compact: boolean) =>
    act(async () =>
      root.render(
        createElement(Friends, {
          // Only the fields the component reads.
          data: data as never,
          friends: friends as never,
          onProfile: () => {},
          compact,
        }),
      ),
    );
  const $ = (s: string) => dom.window.document.querySelector(s);
  const tab = (name: string) =>
    [...dom.window.document.querySelectorAll(".friends-tabs button")].find(
      (b) => b.textContent!.startsWith(name),
    )!;

  await render(false);
  assert.equal($(".friends-bento"), null, "the website keeps its intro");

  await render(true);
  assert.equal($(".friends-bento-circle")!.getAttribute("aria-label"), "Mis amigos: 1");
  assert.match($(".friends-bento-requests")!.textContent!, /Ana te envió una solicitud/);

  await act(async () => ($(".friends-bento-circle") as HTMLButtonElement).click());
  assert.equal(tab("Mis amigos").getAttribute("aria-pressed"), "true");
  assert.equal($("#friend-name"), null);

  await act(async () => ($(".friends-bento-search") as HTMLButtonElement).click());
  assert.equal(tab("Buscar personas").getAttribute("aria-pressed"), "true");
  assert.equal(dom.window.document.activeElement?.id, "friend-name");

  await act(async () => ($(".friends-bento-requests") as HTMLButtonElement).click());
  assert.equal(tab("Solicitudes recibidas").getAttribute("aria-pressed"), "true");

  await act(async () => root.unmount());
  dom.window.close();
  for (const [key, d] of originals) {
    if (d) Object.defineProperty(globalThis, key, d);
    else Reflect.deleteProperty(globalThis, key);
  }
});
