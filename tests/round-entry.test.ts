import { test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import type { Hole } from "../lib/domain";
import type { FairwayData } from "../lib/use-fairway";
import { holeEntryIssue } from "../lib/round-entry";
import { NativeRoundEntry } from "../components/native-round-entry";
import { Scorecard } from "../components/scorecard";

const empty = (count: number): Hole[] =>
  Array.from({ length: count }, (_, i) => ({
    hole: i + 1,
    par: null,
    strokes: null,
    putts: null,
    fairway: null,
    gir: null,
  }));

test("round entry keeps unknown statistics empty and validates every optional field", () => {
  const hole = empty(9)[0];
  assert.equal(holeEntryIssue(hole), null);
  assert.ok(holeEntryIssue(hole, true));
  assert.equal(holeEntryIssue({ ...hole, strokes: 4, putts: 0 }, true), null);
  for (const [key, value] of [
    ["strokes", 0],
    ["strokes", 4.5],
    ["par", 2],
    ["putts", -1],
    ["distance", 901],
    ["index", 19],
    ["strokes", Number.NaN],
  ] as const) {
    assert.ok(
      holeEntryIssue({ ...hole, [key]: value }),
      `${key} rejects ${value}`,
    );
  }
});

test("the website retains the score table; only the native branch gets the guided entry", () => {
  const data = { clubs: [] } as unknown as FairwayData;
  const web = renderToStaticMarkup(
    createElement(Scorecard, { data, onDone() {} }),
  );
  assert.match(web, /class="score-table"/);
  assert.match(web, /Golpes, hoyo 9/);
  assert.doesNotMatch(web, /native-round-steps/);
  const app = renderToStaticMarkup(
    createElement(Scorecard, { data, native: true, onDone() {} }),
  );
  assert.match(app, /Prepara tu ronda/);
  assert.doesNotMatch(app, /class="score-table"/);
});

async function mount(
  initial: Hole[],
  options: {
    editing?: boolean;
    configured?: boolean;
    published?: boolean;
  } = {},
) {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://127.0.0.1/" });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    Event: dom.window.Event,
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
  const saved: {
    status: string;
    scores: Hole[];
    fields: Record<string, FormDataEntryValue>;
  }[] = [];
  function Harness() {
    const [scores, setScores] = useState(initial);
    return createElement(
      "form",
      null,
      createElement(NativeRoundEntry, {
        scores,
        editing: !!options.editing,
        published: !!options.published,
        configured: !!options.configured,
        busy: false,
        setup: createElement(
          "div",
          null,
          createElement("input", {
            name: "tee",
            required: true,
            defaultValue: options.editing ? "Blancas" : "",
            "aria-label": "Tee",
          }),
          createElement("input", {
            name: "date",
            type: "date",
            required: true,
            defaultValue: "2026-11-04",
          }),
          createElement(
            "select",
            { name: "privacy", defaultValue: "private" },
            createElement("option", { value: "private" }, "Solo yo"),
          ),
        ),
        notes: createElement("textarea", {
          name: "notes",
          defaultValue: "Una ronda de prueba",
        }),
        onChange(index, key, value) {
          setScores((old) =>
            old.map((h, i) => (i === index ? { ...h, [key]: value } : h)),
          );
        },
        async onSave(form, status) {
          saved.push({
            status,
            scores: structuredClone(scores),
            fields: Object.fromEntries(new dom.window.FormData(form)),
          });
        },
      }),
    );
  }
  await act(async () => root.render(createElement(Harness)));
  const doc = dom.window.document;
  async function click(text: string) {
    const button = Array.from(
      doc.querySelectorAll<HTMLButtonElement>("button"),
    ).find(
      (el) =>
        (el.textContent?.trim() === text ||
          el.getAttribute("aria-label") === text) &&
        !el.closest("[hidden]"),
    );
    assert.ok(button, `Visible button: ${text}`);
    await act(async () => button.click());
  }
  async function input(label: string, value: string) {
    const control = Array.from(
      doc.querySelectorAll<HTMLInputElement>("input"),
    ).find((el) => el.getAttribute("aria-label") === label)!;
    assert.ok(control, label);
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        dom.window.HTMLInputElement.prototype,
        "value",
      )!.set!.call(control, value);
      control.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      control.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
  }
  return {
    doc,
    saved,
    click,
    input,
    async cleanup() {
      await act(async () => root.unmount());
      dom.window.close();
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

test("nine-hole entry validates setup, preserves prior holes, and saves a partial draft with metadata", async () => {
  const env = await mount(empty(9));
  try {
    await env.click("Empezar ronda");
    assert.equal(
      env.doc.querySelector(".native-round-setup")?.hasAttribute("hidden"),
      false,
    );
    assert.match(
      env.doc.querySelector('[role="alert"]')!.textContent!,
      /Revisa los datos/,
    );
    await env.input("Tee", "Blancas");
    await env.click("Empezar ronda");
    assert.equal(
      env.doc.querySelectorAll('[aria-label^="Golpes, hoyo"]').length,
      1,
    );
    await env.click("Siguiente");
    assert.match(
      env.doc.querySelector('[role="alert"]')!.textContent!,
      /Anota los golpes/,
    );
    await env.click("Anotar 4 golpes");
    await env.click("Siguiente");
    assert.match(
      env.doc.querySelector("#native-hole-title")!.textContent!,
      /Hoyo 2/,
    );
    await env.click("Anterior");
    assert.equal(
      env.doc.querySelector<HTMLInputElement>('[aria-label="Golpes, hoyo 1"]')!
        .value,
      "4",
    );
    await env.click("Siguiente");
    await env.click("Dejar este hoyo pendiente");
    assert.match(
      env.doc.querySelector("#native-hole-title")!.textContent!,
      /Hoyo 3/,
    );
    await env.click("Revisión");
    assert.equal(
      env.doc.querySelectorAll(".native-round-review-grid button").length,
      9,
    );
    await env.click("Borrador");
    assert.equal(env.saved.length, 1);
    assert.equal(env.saved[0].status, "draft");
    assert.equal(env.saved[0].scores[0].strokes, 4);
    assert.equal(env.saved[0].scores[1].strokes, null);
    assert.equal(env.saved[0].scores[0].putts, null);
    assert.deepEqual(env.saved[0].fields, {
      tee: "Blancas",
      date: "2026-11-04",
      privacy: "private",
      notes: "Una ronda de prueba",
    });
    assert.equal(env.doc.querySelectorAll("table").length, 0);
  } finally {
    await env.cleanup();
  }
});

test("eighteen-hole review edits the last hole without losing tee data or a real zero-putt value", async () => {
  const scores = empty(18).map((h) => ({
    ...h,
    par: 4,
    strokes: 4,
    distance: 350,
    index: h.hole,
  }));
  const env = await mount(scores, { editing: true, configured: true });
  try {
    await env.click("Editar hoyo 18, 4 golpes");
    const readOnlyFields = env.doc.querySelectorAll(
      ".native-hole-entry input[readonly]",
    );
    assert.equal(
      readOnlyFields.length,
      3,
      "configured par, distance and index are locked",
    );
    await env.input("Putts, hoyo 18", "0");
    await env.click("Anotar 5 golpes");
    await env.click("Revisar ronda");
    await env.click("Guardar ronda");
    assert.equal(env.saved[0].status, "finished");
    assert.equal(env.saved[0].scores[17].strokes, 5);
    assert.equal(env.saved[0].scores[17].putts, 0);
    assert.equal(env.saved[0].scores[17].distance, 350);
    assert.equal(env.saved[0].scores[0].strokes, 4);
  } finally {
    await env.cleanup();
  }
});

test("invalid values on an unmounted hole block saving and reopen the right hole", async () => {
  const scores = empty(18).map((h) => ({ ...h, strokes: 4 }));
  scores[12].putts = -1;
  const env = await mount(scores, { editing: true });
  try {
    await env.click("Guardar ronda");
    assert.equal(env.saved.length, 0);
    assert.match(
      env.doc.querySelector("#native-hole-title")!.textContent!,
      /Hoyo 13/,
    );
    assert.match(
      env.doc.querySelector('[role="alert"]')!.textContent!,
      /Los putts/,
    );
  } finally {
    await env.cleanup();
  }
});

test("saving edits to a published round preserves publication", async () => {
  const env = await mount(
    empty(9).map((h) => ({ ...h, strokes: 4 })),
    { editing: true, published: true },
  );
  try {
    await env.click("Guardar cambios");
    assert.equal(env.saved[0].status, "published");
    assert.equal(env.doc.querySelector(".native-round-share"), null);
  } finally {
    await env.cleanup();
  }
});
