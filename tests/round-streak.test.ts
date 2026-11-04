import { test } from "node:test";
import assert from "node:assert/strict";
import { roundStreak } from "../lib/round-streak";
import type { Round } from "../lib/domain";

const round = (played_at: string, status = "published") =>
  ({ played_at, status }) as Round;
// Wednesday 4 November 2026, local time.
const now = new Date(2026, 10, 4, 21, 30);

test("no finished rounds means no note", () => {
  assert.equal(roundStreak([], now), null);
  assert.equal(roundStreak([round("2026-11-02", "draft")], now), null);
  assert.equal(roundStreak([round("2026-11-20")], now), null);
});

test("consecutive weeks count, including this week", () => {
  const streak = roundStreak(
    [round("2026-11-02"), round("2026-10-28"), round("2026-10-20")],
    now,
  )!;
  assert.equal(streak.title, "3 semanas seguidas con ronda");
  assert.match(streak.detail, /Esta semana ya cuenta/);
});

test("a streak stays alive until this week ends", () => {
  const streak = roundStreak([round("2026-10-30"), round("2026-10-21")], now)!;
  assert.equal(streak.title, "2 semanas seguidas con ronda");
  assert.match(streak.detail, /esta semana para mantener/);
});

test("a gap breaks the streak and shows days since the last round", () => {
  const note = roundStreak([round("2026-10-25"), round("2026-10-10")], now)!;
  assert.equal(note.title, "Tu última ronda fue hace 10 días");
  assert.equal(
    roundStreak([round("2026-11-03")], now)!.title,
    "Tu última ronda fue ayer",
  );
  assert.equal(roundStreak([round("2026-11-04")], now)!.title, "Jugaste hoy");
});

test("late evening uses the local date, not UTC", () => {
  // 23:30 local can already be the next day in UTC.
  const late = new Date(2026, 10, 4, 23, 30);
  assert.equal(roundStreak([round("2026-11-04")], late)!.title, "Jugaste hoy");
});

test("weeks across a daylight-saving change still count (run under several TZs)", () => {
  // 1 Nov 2026 is the US fall-back day; 25 Oct the European one.
  const streak = roundStreak([round("2026-10-30"), round("2026-10-21")], now)!;
  assert.equal(streak.title, "2 semanas seguidas con ronda");
  const spring = new Date(2026, 2, 11, 12);
  assert.equal(
    roundStreak([round("2026-03-09"), round("2026-03-04")], spring)!.title,
    "2 semanas seguidas con ronda",
  );
});

test("Sunday to Monday, year change and invalid dates", () => {
  const monday = new Date(2027, 0, 4, 9);
  assert.equal(
    roundStreak([round("2027-01-03"), round("2026-12-22")], monday)!.title,
    "2 semanas seguidas con ronda",
  );
  assert.equal(roundStreak([round("not a date")], now), null);
});
