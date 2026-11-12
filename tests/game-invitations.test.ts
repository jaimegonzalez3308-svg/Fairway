import { test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { JSDOM } from "jsdom";
import { createClient } from "@supabase/supabase-js";
import { invitationStatuses, invitationSummary } from "../lib/party-repeat";

test("invitation statuses: joined with participants, ordered, never 'declined'", () => {
  const rows = invitationStatuses(
    [
      { invitee_id: "ana" },
      { invitee_id: "luis" },
      { invitee_id: "eva" },
      { invitee_id: "ana" },
      { invitee_id: "paco" },
      { invitee_id: "zoe" },
    ],
    [
      { user_id: "luis", status: "confirmed" },
      { user_id: "eva", status: "rejected" },
      { user_id: "paco", status: "requested" },
      { user_id: "me", status: "confirmed" },
    ],
    [
      { id: "ana", name: "Ana" },
      { id: "luis", name: "Luis" },
      { id: "eva", name: "Eva" },
      { id: "paco", name: "Paco" },
    ],
  );
  assert.deepEqual(
    rows.map((r) => [r.name, r.label]),
    [
      ["Luis", "Confirmado"],
      ["Paco", "Pidió lugar"],
      ["Ana", "Sin solicitud activa"],
      ["Golfista", "Sin solicitud activa"],
      ["Eva", "Solicitud no aceptada"],
    ],
  );
  assert.equal(invitationSummary(rows), "1 de 5 invitados confirmaron.");
  assert.equal(
    invitationSummary([{ state: "none" }]),
    "0 de 1 invitado confirmó.",
  );
  assert.deepEqual(invitationStatuses([]), []);
});

test("invitation list: scoped query, refresh keeps the list, stale and failed answers handled", async () => {
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
  const { GameInvitations } = await import("../components/game-invitations");

  const queries: URLSearchParams[] = [];
  const answers: Record<string, () => Promise<Response>> = {};
  const json = (body: unknown, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
    );
  const client = createClient("https://invites-test.invalid", "test-key", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: "invites-test",
    },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        assert.equal(url.pathname, "/rest/v1/game_invitations");
        assert.equal(init?.method ?? "GET", "GET");
        queries.push(url.searchParams);
        const game = url.searchParams.get("game_id")!.replace("eq.", "");
        return answers[game]();
      },
    },
  });

  const root = createRoot(document.getElementById("root")!);
  const profiles = [
    { id: "ana", name: "Ana" },
    { id: "luis", name: "Luis" },
  ];
  const render = (gameId: string, refresh = 0) =>
    act(async () => {
      root.render(
        createElement(GameInvitations, {
          gameId,
          userId: "me",
          participants: [{ user_id: "luis", status: "confirmed" }],
          profiles,
          refresh,
          client,
        }),
      );
    });
  const text = () => document.getElementById("root")!.textContent;

  try {
    // Only this game's invitations sent by this account are requested.
    answers.g1 = () =>
      json([
        { invitee_id: "ana", created_at: "2026-11-01T00:00:00Z" },
        { invitee_id: "luis", created_at: "2026-11-01T00:00:01Z" },
      ]);
    await render("g1");
    await act(async () => {});
    assert.equal(queries[0].get("game_id"), "eq.g1");
    assert.equal(queries[0].get("sender_id"), "eq.me");
    assert.match(text()!, /Invitados1 de 2 invitados confirmaron\./);
    assert.match(text()!, /LuisConfirmadoAnaSin solicitud activa/);

    // A refresh keeps the current list while it reloads.
    let finish!: () => void;
    answers.g1 = () =>
      new Promise((resolve) => (finish = () => resolve(json([])))).then(
        (r) => r as Response,
      );
    await render("g1", 1);
    assert.match(text()!, /Ana/);
    await act(async () => finish());
    await act(async () => {});
    assert.equal(text(), "");

    // Switching games never shows the previous game's list, and a late
    // answer for the old game is ignored.
    let lateOld!: () => void;
    answers.g1 = () =>
      new Promise(
        (resolve) => (lateOld = () => resolve(json([{ invitee_id: "ana" }]))),
      ).then((r) => r as Response);
    await render("g1", 2);
    answers.g2 = () => json([{ invitee_id: "luis" }]);
    await render("g2");
    await act(async () => {});
    await act(async () => lateOld());
    await act(async () => {});
    assert.match(text()!, /1 de 1 invitado confirmó\./);
    assert.doesNotMatch(text()!, /Ana/);

    // A failed read says so without inventing a status.
    answers.g3 = () => json({ message: "denied" }, 403);
    await render("g3");
    await act(async () => {});
    assert.match(text()!, /No pudimos cargar a quién invitaste/);
    answers.g3 = () => json([{ invitee_id: "ana" }]);
    await act(async () =>
      document.querySelector<HTMLButtonElement>("button")!.click(),
    );
    await act(async () => {});
    assert.match(text()!, /AnaSin solicitud activa/);
    assert.doesNotMatch(text()!, /No pudimos cargar/);
  } finally {
    await act(async () => root.unmount());
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as Record<string, unknown>)[key];
    }
    dom.window.close();
  }
});
