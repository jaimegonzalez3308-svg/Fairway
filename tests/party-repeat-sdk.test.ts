import { test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { JSDOM } from "jsdom";
import { createClient } from "@supabase/supabase-js";

// Repeating a party through the real Supabase SDK with a mocked network:
// the games insert carries every copied setting, each previous player gets
// exactly one invite_to_game call, and nothing is retried.

type Mode = "ok" | "insert-error" | "invite-error" | "invite-offline";

function backend(mode: Mode, holdFirstInvite = false) {
  const inserts: Record<string, unknown>[] = [];
  const invites: { g: string; invitee: string }[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let started!: () => void;
  const firstInviteStarted = new Promise<void>((resolve) => (started = resolve));
  let finished!: () => void;
  const allInvitesSettled = new Promise<void>((resolve) => (finished = resolve));
  let expected = 0;
  let settled = 0;
  const response = (body: unknown, status = 200) =>
    new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  const client = createClient("https://party-test.invalid", "test-key", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: `party-test-${Math.random()}`,
    },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname === "/rest/v1/games" && init?.method === "POST") {
          inserts.push(JSON.parse(String(init.body)));
          return mode === "insert-error"
            ? response({ message: "Insert rechazado", code: "42501" }, 403)
            : response(null, 201);
        }
        if (url.pathname === "/rest/v1/rpc/invite_to_game") {
          const index = invites.push(JSON.parse(String(init?.body))) - 1;
          try {
            if (index === 0) {
              started();
              if (holdFirstInvite) await gate;
            }
            if (mode === "invite-offline") throw new TypeError("fetch failed");
            if (mode === "invite-error" && index === 0)
              return response(
                { message: "Invitación no permitida", code: "P0001" },
                400,
              );
            return response(null, 204);
          } finally {
            settled++;
            if (settled === expected) finished();
          }
        }
        throw new Error(`Unexpected request ${init?.method} ${url.pathname}`);
      },
    },
  });
  return {
    client,
    inserts,
    invites,
    release,
    firstInviteStarted,
    allInvitesSettled,
    expect: (n: number) => (expected = n),
  };
}

test("repeat form at the SDK boundary: payload, one invite each, no retries, dismissal-safe", async () => {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://127.0.0.1/" });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    location: dom.window.location,
    localStorage: dom.window.localStorage,
    HTMLElement: dom.window.HTMLElement,
    FormData: dom.window.FormData,
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
  const { GameForm } = await import("../components/forms");
  const { gameTemplate } = await import("../lib/party-repeat");

  const template = gameTemplate({
    id: "g1",
    host_id: "me",
    club_id: "club-2",
    starts_at: "2026-10-31T14:10:00.000Z",
    holes: 9,
    capacity: 3,
    format: "Scramble",
    kind: "competitivo",
    privacy: "invite",
    join_mode: "request",
    description: "La de los sábados",
    access_conditions: "Solo socios",
    status: "finished",
  });
  const invitees = [
    { id: "ana", name: "Ana" },
    { id: "luis", name: "Luis" },
  ] as never[];

  async function mount(api: ReturnType<typeof backend>, invite = true) {
    const root = createRoot(document.getElementById("root")!);
    const notes: string[] = [];
    const done: string[] = [];
    const data = {
      user: { id: "me" },
      clubs: [
        { id: "club-1", name: "Club Uno" },
        { id: "club-2", name: "Club Dos" },
      ],
      partiesAvailable: true,
      notify: (s: string) => notes.push(s),
      // Same contract as useFairway's run: awaits the SDK call, reports errors.
      run: async (
        fn: () => PromiseLike<{ error: unknown }>,
        success?: string,
      ) => {
        const { error } = await fn();
        if (error) {
          notes.push((error as { message?: string }).message || "error");
          return false;
        }
        if (success) notes.push(success);
        return true;
      },
    } as never;
    await act(async () => {
      root.render(
        createElement(GameForm, {
          data,
          template,
          invitees,
          client: api.client,
          onDone: (_date: string, id: string) => {
            done.push(id);
          },
        }),
      );
    });
    const form = document.querySelector("form")!;
    if (!invite) {
      await act(async () => {
        form.querySelector<HTMLInputElement>(".party-repeat-invite input")!.click();
      });
    }
    return {
      root,
      notes,
      done,
      submit: () =>
        act(async () => {
          form.dispatchEvent(
            new dom.window.Event("submit", { bubbles: true, cancelable: true }),
          );
        }),
      // Starts submission without holding an act scope open, so the sheet can
      // be dismissed while the request is still in flight.
      startSubmit: () =>
        form.dispatchEvent(
          new dom.window.Event("submit", { bubbles: true, cancelable: true }),
        ),
    };
  }
  const settle = () => act(async () => {});

  try {
    // Checked: one insert with every copied setting, then one call per player.
    let api = backend("ok");
    api.expect(2);
    let view = await mount(api);
    await view.submit();
    await api.allInvitesSettled;
    await settle();
    assert.equal(api.inserts.length, 1);
    const row = api.inserts[0];
    assert.match(String(row.id), /^[0-9a-f-]{36}$/);
    assert.deepEqual(
      { ...row, id: "<uuid>" },
      {
        id: "<uuid>",
        host_id: "me",
        club_id: "club-2",
        starts_at: new Date(`${template.date}T08:10:00-06:00`).toISOString(),
        holes: 9,
        capacity: 3,
        format: "Scramble",
        kind: "competitivo",
        privacy: "invite",
        join_mode: "request",
        description: "La de los sábados",
        access_conditions: "Solo socios",
      },
    );
    assert.deepEqual(api.invites, [
      { g: row.id, invitee: "ana" },
      { g: row.id, invitee: "luis" },
    ]);
    assert.deepEqual(view.done, [row.id]);
    assert.deepEqual(view.notes, [
      "Partida publicada. Invitamos a 2 jugadores de la última vez; cada quien confirma su lugar.",
    ]);
    await act(async () => view.root.unmount());

    // Unchecked: insert only, no invitation calls.
    api = backend("ok");
    view = await mount(api, false);
    await view.submit();
    assert.equal(api.inserts.length, 1);
    assert.equal(api.invites.length, 0);
    assert.equal(view.done.length, 1);
    await act(async () => view.root.unmount());

    // Insert rejected: no invitations, no completion.
    api = backend("insert-error");
    view = await mount(api);
    await view.submit();
    assert.equal(api.inserts.length, 1);
    assert.equal(api.invites.length, 0);
    assert.equal(view.done.length, 0);
    assert.deepEqual(view.notes, ["Insert rechazado"]);
    await act(async () => view.root.unmount());

    // Server refuses one invitation: named once, never retried.
    api = backend("invite-error");
    api.expect(2);
    view = await mount(api);
    await view.submit();
    await api.allInvitesSettled;
    await settle();
    assert.deepEqual(
      api.invites.map((i) => i.invitee),
      ["ana", "luis"],
    );
    assert.deepEqual(view.notes, [
      "Partida publicada, pero no pudimos invitar a Ana. Invítalos desde la partida.",
    ]);
    assert.equal(view.done.length, 1);
    await act(async () => view.root.unmount());

    // Network failure on every invitation: each tried once, all named.
    api = backend("invite-offline");
    api.expect(2);
    view = await mount(api);
    await view.submit();
    await api.allInvitesSettled;
    await settle();
    assert.equal(api.invites.length, 2);
    assert.deepEqual(view.notes, [
      "Partida publicada, pero no pudimos invitar a Ana, Luis. Invítalos desde la partida.",
    ]);
    await act(async () => view.root.unmount());

    // Dismissed while invitations are in flight: the rest still go out
    // exactly once, and the closed form never completes into another sheet.
    api = backend("ok", true);
    api.expect(2);
    view = await mount(api);
    view.startSubmit();
    await api.firstInviteStarted;
    await act(async () => view.root.unmount());
    api.release();
    await api.allInvitesSettled;
    await settle();
    assert.deepEqual(
      api.invites.map((i) => i.invitee),
      ["ana", "luis"],
    );
    assert.equal(api.inserts.length, 1);
    assert.equal(view.done.length, 0);
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as Record<string, unknown>)[key];
    }
    dom.window.close();
  }
});
