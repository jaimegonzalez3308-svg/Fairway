import type { Game } from "./domain";
import { golfDate } from "./parties";

function utcDay(date: string) {
  return new Date(`${date}T12:00:00Z`);
}
export function shiftCalendarDay(date: string, days: number) {
  const value = utcDay(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function shiftCalendarMonth(date: string, months: number) {
  const value = utcDay(date);
  const day = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0),
  ).getUTCDate();
  value.setUTCDate(Math.min(day, last));
  return value.toISOString().slice(0, 10);
}
export function calendarMonthDays(month: string) {
  const first = `${month}-01`;
  const weekday = (utcDay(first).getUTCDay() + 6) % 7; // Lunes primero.
  const days = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();
  const start = shiftCalendarDay(first, -weekday);
  return Array.from({ length: Math.ceil((weekday + days) / 7) * 7 }, (_, i) =>
    shiftCalendarDay(start, i),
  );
}
export function calendarMonthBounds(month: string) {
  return {
    start: `${month}-01T00:00:00-06:00`,
    end: `${shiftCalendarMonth(`${month}-01`, 1)}T00:00:00-06:00`,
  };
}
export function gamesInCalendarMonth(games: Game[], month: string) {
  return games
    .filter((g) => golfDate(g.starts_at).startsWith(month))
    .sort(
      (a, b) =>
        a.starts_at.localeCompare(b.starts_at) || a.id.localeCompare(b.id),
    );
}
export function groupCalendarGames(games: Game[]) {
  const grouped = new Map<string, Game[]>();
  for (const game of games) {
    const day = golfDate(game.starts_at);
    const items = grouped.get(day) || [];
    items.push(game);
    grouped.set(day, items);
  }
  for (const items of grouped.values())
    items.sort(
      (a, b) =>
        a.starts_at.localeCompare(b.starts_at) || a.id.localeCompare(b.id),
    );
  return grouped;
}
