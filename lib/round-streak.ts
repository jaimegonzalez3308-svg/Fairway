import type { Round } from "./domain";

const DAY = 86_400_000;

/** Local midnight for a round date ("YYYY-MM-DD" or an ISO timestamp). */
function localDay(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday of the week containing `day`. */
function weekStart(day: Date) {
  const monday = new Date(day);
  monday.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return monday.getTime();
}

/** A short, honest note about the member's own rhythm: consecutive weeks
 * with a finished round, or how long since the last one. Drafts and future
 * dates do not count. Nothing is compared with other members. */
export function roundStreak(rounds: Round[], now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const played = rounds
    .filter((round) => round.status !== "draft")
    .map((round) => localDay(round.played_at))
    .filter((day) => !Number.isNaN(day.getTime()) && day <= today);
  if (!played.length) return null;
  const weeks = new Set(played.map(weekStart));
  const thisWeek = weekStart(today);
  const lastWeek = thisWeek - 7 * DAY;
  // The streak may still be alive if only this week is missing so far.
  let cursor = weeks.has(thisWeek) ? thisWeek : lastWeek;
  let streak = 0;
  while (weeks.has(cursor)) {
    streak += 1;
    // Step back a week by calendar date, safe across daylight saving.
    const previous = new Date(cursor);
    previous.setDate(previous.getDate() - 7);
    cursor = weekStart(previous);
  }
  const latest = Math.max(...played.map((day) => day.getTime()));
  const daysAgo = Math.round((today.getTime() - latest) / DAY);
  const playedThisWeek = weeks.has(thisWeek);
  if (streak >= 2)
    return {
      title: `${streak} semanas seguidas con ronda`,
      detail: playedThisWeek
        ? "Esta semana ya cuenta. Sigue así."
        : "Anota una ronda esta semana para mantener la racha.",
    };
  return {
    title:
      daysAgo === 0
        ? "Jugaste hoy"
        : daysAgo === 1
          ? "Tu última ronda fue ayer"
          : `Tu última ronda fue hace ${daysAgo} días`,
    detail: playedThisWeek
      ? "Juega la próxima semana para empezar una racha."
      : "Una ronda esta semana empieza tu racha.",
  };
}
