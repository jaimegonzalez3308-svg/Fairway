"use client";
import type { Game } from "@/lib/domain";
import { partyWeek } from "@/lib/party-week";

/** App-only week at a glance for Partidas: how many parties fall in the next
 * seven days, a few personal counts, and a strip of days. Tapping a day shows
 * only that day's parties; tapping it again shows every date. */
export function PartyWeekStrip({
  games,
  now,
  selected,
  onSelect,
  stats,
}: {
  games: Game[];
  now: Date;
  /** The filtered day, or "" when every date is shown. */
  selected: string;
  onSelect: (date: string) => void;
  stats: { label: string; value: number }[];
}) {
  const days = partyWeek(games, now);
  const total = days.reduce((sum, day) => sum + day.games, 0);
  return (
    <section className="native-party-week" aria-label="Tu semana de golf">
      <div className="native-party-week-summary">
        <div className="native-party-week-total">
          <span>Esta semana</span>
          <strong>{total}</strong>
          <small>{total === 1 ? "partida" : "partidas"}</small>
        </div>
        <ul>
          {stats.map((stat) => (
            <li key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="native-party-week-days">
        {days.map((day) => (
          <button
            key={day.date}
            type="button"
            className={day.today ? "is-today" : undefined}
            aria-pressed={selected === day.date}
            aria-current={day.today ? "date" : undefined}
            aria-label={`${day.label}, ${day.games} ${day.games === 1 ? "partida" : "partidas"}${selected === day.date ? ". Toca otra vez para ver todas las fechas" : ""}`}
            onClick={() => onSelect(selected === day.date ? "" : day.date)}
          >
            <span>{day.weekday}</span>
            <strong>{day.day}</strong>
            <i className={day.games ? "has-games" : undefined} />
          </button>
        ))}
      </div>
    </section>
  );
}
