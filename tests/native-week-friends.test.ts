import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { act, createElement, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM, VirtualConsole } from "jsdom";
import { partyWeek } from "../lib/party-week";
import { greeting } from "../lib/greeting";
import type { Game } from "../lib/domain";
import { PartyWeekStrip } from "../components/party-week-strip";

const game = (id: string, starts_at: string) =>
  ({ id, starts_at, status: "open" }) as unknown as Game;

test("the party week starts on León's today and counts games per day", () => {
  // 23:30 in León on Nov 5 is already Nov 6 in UTC.
  const now = new Date("2026-11-06T05:30:00Z");
  const days = partyWeek(
    [
      game("a", "2026-11-06T03:00:00Z"), // Nov 5, 21:00 León
      game("b", "2026-11-07T15:00:00Z"),
      game("c", "2026-11-07T18:00:00Z"),
      game("d", "2026-11-12T15:00:00Z"), // eighth day: outside
    ],
    now,
  );
  assert.equal(days.length, 7);
  assert.equal(days[0].date, "2026-11-05");
  assert.equal(days[0].today, true);
  assert.equal(days[0].games, 1);
  assert.equal(days[2].date, "2026-11-07");
  assert.equal(days[2].games, 2);
  assert.equal(days[6].date, "2026-11-11");
  assert.equal(
    days.reduce((n, d) => n + d.games, 0),
    3,
  );
  assert.equal(days[0].day, "5");
  assert.doesNotMatch(days[0].weekday, /\./);
  // Month change stays continuous.
  const end = partyWeek([], new Date("2026-11-28T18:00:00Z"));
  assert.deepEqual(
    end.map((d) => d.date.slice(5)),
    ["11-28", "11-29", "11-30", "12-01", "12-02", "12-03", "12-04"],
  );
});

test("greeting follows the device's hour", () => {
  const at = (h: number) => greeting(new Date(2026, 10, 5, h, 0));
  assert.equal(at(4), "Buenas noches");
  assert.equal(at(5), "Buenos días");
  assert.equal(at(11), "Buenos días");
  assert.equal(at(12), "Buenas tardes");
  assert.equal(at(18), "Buenas tardes");
  assert.equal(at(19), "Buenas noches");
});

test("the week strip marks today, dots days with play and toggles a day", async () => {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://127.0.0.1/" });
  const keys = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(keys)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(dom.window.document.getElementById("root")!);
  const now = new Date("2026-11-05T18:00:00Z");
  const picks: string[] = [];
  function Harness() {
    const [selected, setSelected] = useState("");
    return createElement(PartyWeekStrip, {
      games: [game("a", "2026-11-07T15:00:00Z")],
      now,
      selected,
      onSelect: (day: string) => {
        picks.push(day);
        setSelected(day);
      },
      stats: [{ label: "Hoy", value: 0 }],
    });
  }
  await act(async () => root.render(createElement(Harness)));
  const buttons = () =>
    [...dom.window.document.querySelectorAll(".native-party-week-days button")];
  assert.equal(buttons().length, 7);
  assert.equal(buttons()[0].getAttribute("aria-current"), "date");
  assert.equal(
    dom.window.document.querySelectorAll("i.has-games").length,
    1,
  );
  assert.match(buttons()[2].getAttribute("aria-label")!, /1 partida$/);
  assert.equal(
    dom.window.document.querySelector(".native-party-week-total strong")!
      .textContent,
    "1",
  );
  await act(async () => (buttons()[2] as HTMLButtonElement).click());
  assert.equal(buttons()[2].getAttribute("aria-pressed"), "true");
  await act(async () => (buttons()[2] as HTMLButtonElement).click());
  assert.equal(buttons()[2].getAttribute("aria-pressed"), "false");
  assert.deepEqual(picks, ["2026-11-07", ""]);
  await act(async () => root.unmount());
  dom.window.close();
  for (const [key, d] of originals) {
    if (d) Object.defineProperty(globalThis, key, d);
    else Reflect.deleteProperty(globalThis, key);
  }
});

const parties = readFileSync(
  new URL("../components/parties.tsx", import.meta.url),
  "utf8",
);
const friends = readFileSync(
  new URL("../components/friends.tsx", import.meta.url),
  "utf8",
);
const discovery = readFileSync(
  new URL("../components/discovery.tsx", import.meta.url),
  "utf8",
);

test("week strip, friends hub and greeting are app-only", () => {
  assert.match(parties, /\{compact && \(\s*<PartyWeekStrip/);
  assert.match(friends, /\{compact && \(\s*<FriendsBento/);
  const head = discovery.indexOf('<div className="native-discover-head">');
  assert.ok(head > 0 && discovery.indexOf("native-greeting") > head);
  assert.ok(
    discovery.lastIndexOf("{compact ? (", head) > 0,
    "greeting sits inside the compact branch",
  );
});

test("calendar agenda faces show only in the app", () => {
  const globals = readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const nativeCss = readFileSync(
    new URL("../app/native-app.css", import.meta.url),
    "utf8",
  );
  const html = (native: boolean) =>
    `<html class="${native ? "native-ios" : ""}"><head><style>${globals}</style><style>${nativeCss}</style></head><body><div class="native-app"><div class="party-avatar-stack party-agenda-people"><span>A</span></div></div></body></html>`;
  for (const native of [false, true]) {
    const dom = new JSDOM(html(native), { virtualConsole: new VirtualConsole() });
    const display = dom.window.getComputedStyle(
      dom.window.document.querySelector(".party-agenda-people")!,
    ).display;
    assert.equal(display === "none", !native);
    dom.window.close();
  }
});

test("friends hub uses neutral copy and keeps the web intro", () => {
  assert.doesNotMatch(friends, /quiere ser tu amig[oa]/);
  assert.match(friends, /te envió una solicitud/);
  assert.match(friends, /<div className="panel friends-intro">/);
  // The static strip renders without a browser.
  const markup = renderToStaticMarkup(
    createElement(PartyWeekStrip, {
      games: [],
      now: new Date("2026-11-05T18:00:00Z"),
      selected: "",
      onSelect: () => {},
      stats: [],
    }),
  );
  assert.match(markup, /aria-label="Tu semana de golf"/);
});
