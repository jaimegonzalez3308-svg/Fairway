import { test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { JSDOM } from "jsdom";

test("repeat form: prefilled, invites only when checked, safe on failure or dismissal", async () => {
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

  const template = gameTemplate(
    {
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
    },
    new Date(),
  );
  const invitees = [
    { id: "ana", name: "Ana" },
    { id: "luis", name: "Luis" },
  ] as never[];

  async function mount(options: {
    runResult: boolean;
    hold?: Promise<void>;
  }) {
    const root = createRoot(document.getElementById("root")!);
    const notes: string[] = [];
    const done: string[] = [];
    let runs = 0;
    const data = {
      user: { id: "me" },
      clubs: [
        { id: "club-1", name: "Club Uno" },
        { id: "club-2", name: "Club Dos" },
      ],
      partiesAvailable: true,
      notify: (s: string) => notes.push(s),
      run: async () => {
        runs++;
        await options.hold;
        return options.runResult;
      },
    } as never;
    await act(async () => {
      root.render(
        createElement(GameForm, {
          data,
          template,
          invitees,
          onDone: (_date: string, id: string) => {
            done.push(id);
          },
        }),
      );
    });
    const form = document.querySelector("form")!;
    return {
      root,
      form,
      notes,
      done,
      runs: () => runs,
      value: (name: string) =>
        (form.elements.namedItem(name) as HTMLInputElement).value,
      checkbox: () =>
        form.querySelector<HTMLInputElement>(".party-repeat-invite input")!,
      submit: async () => {
        await act(async () => {
          form.dispatchEvent(
            new dom.window.Event("submit", { bubbles: true, cancelable: true }),
          );
        });
      },
    };
  }

  try {
    // Prefilled from the previous party, invite box visible and checked.
    let view = await mount({ runResult: true });
    assert.equal(view.value("club"), "club-2");
    assert.equal(view.value("date"), template.date);
    assert.equal(view.value("time"), "08:10");
    assert.equal(view.value("holes"), "9");
    assert.equal(view.value("capacity"), "3");
    assert.equal(view.value("format"), "Scramble");
    assert.equal(view.value("kind"), "competitivo");
    assert.equal(view.value("privacy"), "invite");
    assert.equal(view.value("description"), "La de los sábados");
    assert.equal(view.value("access"), "Solo socios");
    assert.match(view.form.textContent!, /Invitar a los mismos jugadores: Ana, Luis/);
    assert.equal(view.checkbox().checked, true);

    // Checked: publishes once, invites each player (no client here, so both
    // fail), reports them by name once, then completes once.
    await view.submit();
    assert.equal(view.runs(), 1);
    assert.equal(view.done.length, 1);
    assert.deepEqual(view.notes, [
      "Partida publicada, pero no pudimos invitar a Ana, Luis. Invítalos desde la partida.",
    ]);
    await act(async () => view.root.unmount());

    // Unchecked: no invitation message at all.
    view = await mount({ runResult: true });
    await act(async () => {
      view.checkbox().click();
    });
    assert.equal(view.checkbox().checked, false);
    await view.submit();
    assert.equal(view.done.length, 1);
    assert.deepEqual(view.notes, []);
    await act(async () => view.root.unmount());

    // Insert failed: no invitations, no completion.
    view = await mount({ runResult: false });
    await view.submit();
    assert.equal(view.done.length, 0);
    assert.deepEqual(view.notes, []);
    await act(async () => view.root.unmount());

    // Dismissed while publishing: never completes into whatever is open now.
    let release!: () => void;
    const hold = new Promise<void>((resolve) => (release = resolve));
    view = await mount({ runResult: true, hold });
    view.checkbox().click();
    const pending = view.submit();
    await act(async () => view.root.unmount());
    release();
    await pending;
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(view.done.length, 0);
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as Record<string, unknown>)[key];
    }
    dom.window.close();
  }
});
