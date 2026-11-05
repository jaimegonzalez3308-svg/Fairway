import type { Game } from "./domain";
import { GOLF_TIMEZONE, golfDate, golfDateAfter } from "./parties";

export type PartyWeekDay = {
  /** YYYY-MM-DD in León's time zone. */
  date: string;
  /** "lun", "mar"… */
  weekday: string;
  /** Day of the month, "5". */
  day: string;
  /** "miércoles 5 de noviembre", for screen readers. */
  label: string;
  today: boolean;
  games: number;
};

/** The next seven golf days (today first) with how many games fall on each. */
export function partyWeek(games: Game[], now = new Date()): PartyWeekDay[] {
  const counts = new Map<string, number>();
  for (const game of games) {
    const day = golfDate(game.starts_at);
    counts.set(day, (counts.get(day) || 0) + 1);
  }
  const weekday = new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    timeZone: GOLF_TIMEZONE,
  });
  const long = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: GOLF_TIMEZONE,
  });
  return Array.from({ length: 7 }, (_, offset) => {
    const date = golfDateAfter(offset, now);
    // Noon in León (UTC−6, no daylight saving) never crosses a date line.
    const instant = new Date(`${date}T12:00:00-06:00`);
    return {
      date,
      weekday: weekday.format(instant).replace(".", ""),
      day: String(Number(date.slice(-2))),
      label: long.format(instant),
      today: offset === 0,
      games: counts.get(date) || 0,
    };
  });
}
