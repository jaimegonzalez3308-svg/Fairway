import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calendarMonthDays,
  shiftCalendarDay,
  shiftCalendarMonth,
  calendarMonthBounds,
  gamesInCalendarMonth,
  groupCalendarGames,
} from "../lib/party-calendar";
import type { Game } from "../lib/domain";

test("el calendario mensual tiene semanas completas de lunes a domingo y todos los días del mes", () => {
  for (const month of [
    "2026-02",
    "2026-03",
    "2026-08",
    "2026-10",
    "2026-12",
    "2027-01",
    "2028-02",
  ]) {
    const cells = calendarMonthDays(month);
    assert.ok([28, 35, 42].includes(cells.length));
    assert.equal(new Date(`${cells[0]}T12:00:00Z`).getUTCDay(), 1);
    assert.equal(new Date(`${cells.at(-1)}T12:00:00Z`).getUTCDay(), 0);
    assert.equal(new Set(cells).size, cells.length);
    const days = new Date(
      Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
    ).getUTCDate();
    assert.equal(cells.filter((date) => date.startsWith(month)).length, days);
    cells
      .slice(1)
      .forEach((date, index) =>
        assert.equal(date, shiftCalendarDay(cells[index], 1)),
      );
  }
  assert.ok(calendarMonthDays("2028-02").includes("2028-02-29"));
  assert.equal(calendarMonthDays("2026-10")[0], "2026-09-28");
  assert.equal(calendarMonthDays("2026-10").at(-1), "2026-11-01");
});

test("mover el mes conserva un día válido, incluidos años y febreros bisiestos", () => {
  assert.equal(shiftCalendarMonth("2026-01-31", 1), "2026-02-28");
  assert.equal(shiftCalendarMonth("2028-01-31", 1), "2028-02-29");
  assert.equal(shiftCalendarMonth("2026-12-31", 1), "2027-01-31");
  assert.equal(shiftCalendarMonth("2027-01-01", -1), "2026-12-01");
  assert.equal(shiftCalendarDay("2026-10-31", 1), "2026-11-01");
  assert.equal(shiftCalendarDay("2026-01-01", -1), "2025-12-31");
  assert.deepEqual(calendarMonthBounds("2026-12"), {
    start: "2026-12-01T00:00:00-06:00",
    end: "2027-01-01T00:00:00-06:00",
  });
});

test("las parties se ubican por la fecha de León, con todas las del día ordenadas y sin ocultar llenas o anteriores", () => {
  const game = (id: string, starts_at: string, status = "open") =>
    ({ id, starts_at, status }) as Game;
  const games = [
    game("last", "2026-11-01T05:59:59Z"), // 31 de octubre a las 23:59 en León.
    game("outside", "2026-10-01T05:59:59Z"), // Todavía es septiembre.
    game("full", "2026-10-16T15:00:00Z", "full"),
    game("early", "2026-10-16T13:00:00Z", "finished"),
    game("same", "2026-10-16T15:00:00Z"),
    game("november", "2026-11-01T06:00:00Z"),
  ];
  const rows = gamesInCalendarMonth(games, "2026-10");
  assert.deepEqual(
    rows.map((g) => g.id),
    ["early", "full", "same", "last"],
  );
  const grouped = groupCalendarGames(rows);
  assert.deepEqual(
    grouped.get("2026-10-16")?.map((g) => g.id),
    ["early", "full", "same"],
  );
  assert.equal(grouped.get("2026-10-31")?.[0].id, "last");
  assert.equal(grouped.get("2026-10-15"), undefined);
  assert.deepEqual(gamesInCalendarMonth(games, "2026-08"), []);
});
