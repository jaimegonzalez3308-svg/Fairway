"use client";
import { useEffect, useRef } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  LoaderCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "./ui";
import type { Game } from "@/lib/domain";
import type { FairwayData } from "@/lib/use-fairway";
import {
  gameIsUpcoming,
  gameSeats,
  golfDate,
  GOLF_TIMEZONE,
} from "@/lib/parties";
import {
  calendarMonthDays,
  groupCalendarGames,
  shiftCalendarDay,
  shiftCalendarMonth,
} from "@/lib/party-calendar";
import { usePartyMonth } from "@/lib/use-party-month";
import { timeFormat } from "@/lib/utils";

const weekdays = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
function eventState(game: Game, now: Date) {
  if (game.status === "cancelled") return { key: "closed", label: "Cancelada" };
  if (game.status === "finished") return { key: "past", label: "Finalizada" };
  if (!gameIsUpcoming(game, now)) return { key: "past", label: "Ya comenzó" };
  if (game.status === "full" || !gameSeats(game).remaining)
    return { key: "full", label: "Grupo completo" };
  const remaining = gameSeats(game).remaining;
  return {
    key: "available",
    label: `${remaining} ${remaining === 1 ? "lugar libre" : "lugares libres"}`,
  };
}

export function PartyMonthCalendar({
  data,
  selectedDate,
  onDateChange,
  onCreate,
  onOpen,
  mine,
  club,
  openOnly,
  now,
}: {
  data: FairwayData;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onCreate: (date?: string) => void;
  onOpen: (game: Game) => void;
  mine: boolean;
  club: string;
  openOnly: boolean;
  now: Date;
}) {
  const month = selectedDate.slice(0, 7);
  const feed = usePartyMonth(month, data);
  const cells = calendarMonthDays(month);
  const today = golfDate(now);
  const monthTitle = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: GOLF_TIMEZONE,
  }).format(new Date(`${month}-01T12:00:00-06:00`));
  const fullDate = (date: string) =>
    new Intl.DateTimeFormat("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: GOLF_TIMEZONE,
    }).format(new Date(`${date}T12:00:00-06:00`));
  const visible = feed.games.filter(
    (g) =>
      (!mine ||
        g.host_id === data.user?.id ||
        g.participants?.some(
          (p) =>
            p.user_id === data.user?.id &&
            ["confirmed", "requested"].includes(p.status),
        )) &&
      (!club || g.club_id === club) &&
      (!openOnly ||
        (gameIsUpcoming(g, now) &&
          g.status === "open" &&
          gameSeats(g).remaining > 0)),
  );
  const grouped = groupCalendarGames(visible);
  const selected = grouped.get(selectedDate) || [];
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusDate = useRef("");
  useEffect(() => {
    if (focusDate.current === selectedDate) {
      dayRefs.current.get(selectedDate)?.focus();
      focusDate.current = "";
    }
  }, [selectedDate]);
  const clubName = (game: Game) =>
    data.clubs.find((c) => c.id === game.club_id)?.name || "Campo de golf";
  function handleDayKey(
    event: React.KeyboardEvent<HTMLButtonElement>,
    date: string,
  ) {
    let next: string | undefined;
    if (event.key === "ArrowRight") next = shiftCalendarDay(date, 1);
    if (event.key === "ArrowLeft") next = shiftCalendarDay(date, -1);
    if (event.key === "ArrowUp") next = shiftCalendarDay(date, -7);
    if (event.key === "ArrowDown") next = shiftCalendarDay(date, 7);
    if (event.key === "PageUp") next = shiftCalendarMonth(date, -1);
    if (event.key === "PageDown") next = shiftCalendarMonth(date, 1);
    if (event.key === "Home" || event.key === "End") {
      const offset = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
      next = shiftCalendarDay(
        date,
        event.key === "Home" ? -offset : 6 - offset,
      );
    }
    if (next) {
      event.preventDefault();
      focusDate.current = next;
      onDateChange(next);
    }
  }
  return (
    <section
      className="party-month-section"
      aria-label="Calendario mensual de parties"
    >
      <div className="party-month-panel panel">
        <div className="party-month-toolbar">
          <div>
            <span className="eyebrow">TU GOLF, MES A MES</span>
            <h2 aria-live="polite">{monthTitle}</h2>
            <p>
              {visible.length} {visible.length === 1 ? "party" : "parties"}
              {mine ? " en tus planes" : " en el calendario"}
            </p>
          </div>
          <div className="party-month-navigation">
            <button
              className="party-month-today"
              onClick={() => onDateChange(today)}
            >
              Hoy
            </button>
            <button
              className="party-month-refresh"
              aria-label="Actualizar el mes"
              disabled={feed.loading || data.demo}
              onClick={() => void feed.refresh()}
            >
              {feed.loading ? (
                <LoaderCircle size={16} className="story-spinner" />
              ) : (
                <RefreshCw size={16} />
              )}
            </button>
            <button
              className="party-month-arrow"
              aria-label="Mes anterior"
              onClick={() => onDateChange(shiftCalendarMonth(selectedDate, -1))}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="party-month-arrow"
              aria-label="Mes siguiente"
              onClick={() => onDateChange(shiftCalendarMonth(selectedDate, 1))}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="party-month-legend">
          <span>
            <i className="available" />
            Con lugares
          </span>
          <span>
            <i className="full" />
            Completa
          </span>
          <span>
            <i className="past" />
            Anterior o cerrada
          </span>
          <small>Hora de León · UTC−6</small>
        </div>
        {feed.error && (
          <div role="alert" className="party-month-error">
            {feed.error}
            <button onClick={() => void feed.refresh()}>Reintentar</button>
          </div>
        )}
        <table
          className="party-month-grid"
          aria-label={`Parties de ${monthTitle}`}
          aria-busy={feed.loading}
        >
          <thead>
            <tr>
              {weekdays.map((name) => (
                <th key={name} scope="col">
                  <abbr title={name}>{name.slice(0, 3)}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: cells.length / 7 }, (_, week) => (
              <tr key={week}>
                {cells.slice(week * 7, week * 7 + 7).map((day) => {
                  const events = grouped.get(day) || [];
                  const outside = !day.startsWith(month);
                  return (
                    <td
                      key={day}
                      className={`${outside ? "outside-month" : ""} ${day === selectedDate ? "selected-day" : ""} ${day === today ? "today" : ""}`}
                    >
                      <button
                        className="party-day-button"
                        ref={(element) => {
                          if (element) dayRefs.current.set(day, element);
                          else dayRefs.current.delete(day);
                        }}
                        tabIndex={day === selectedDate ? 0 : -1}
                        onKeyDown={(event) => handleDayKey(event, day)}
                        onClick={() => onDateChange(day)}
                        aria-pressed={day === selectedDate}
                        aria-current={day === today ? "date" : undefined}
                        aria-label={`${fullDate(day)}, ${events.length} ${events.length === 1 ? "party" : "parties"}. Ver agenda del día.`}
                      >
                        <span className="party-day-number">
                          {Number(day.slice(-2))}
                        </span>
                        {!!events.length && (
                          <span className="party-day-total">
                            {events.length}
                            <span>
                              {" "}
                              {events.length === 1 ? "party" : "parties"}
                            </span>
                          </span>
                        )}
                      </button>
                      <div className="party-day-events">
                        {events.slice(0, 2).map((game) => {
                          const status = eventState(game, now);
                          return (
                            <button
                              className={`party-month-event ${status.key}`}
                              key={game.id}
                              onClick={() => {
                                onDateChange(day);
                                onOpen(game);
                              }}
                              aria-label={`${clubName(game)}, ${timeFormat(game.starts_at)}, ${status.label}. Ver detalles.`}
                            >
                              <span className="party-event-dot" />
                              <span>
                                <time>{timeFormat(game.starts_at)}</time>
                                <strong>{clubName(game)}</strong>
                              </span>
                            </button>
                          );
                        })}
                        {events.length > 2 && (
                          <button
                            className="party-day-more"
                            onClick={() => onDateChange(day)}
                          >
                            +{events.length - 2} más
                          </button>
                        )}
                      </div>
                      {!!events.length && (
                        <div
                          className="party-day-mobile-dots"
                          aria-hidden="true"
                        >
                          {events.slice(0, 3).map((game) => (
                            <i
                              key={game.id}
                              className={eventState(game, now).key}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="party-month-instructions">
          Selecciona un día para ver todas sus parties. Toca una party para ver
          sus detalles y unirte.
        </p>
      </div>
      <section
        className="party-day-agenda"
        aria-label="Parties del día seleccionado"
      >
        <div className="party-day-agenda-heading">
          <div>
            <span className="eyebrow">TU PLAN PARA ESE DÍA</span>
            <h3 aria-live="polite">{fullDate(selectedDate)}</h3>
            <p>
              {selected.length}{" "}
              {selected.length === 1
                ? "party disponible para consultar"
                : "parties disponibles para consultar"}
            </p>
          </div>
          {selectedDate >= today && (
            <Button variant="outline" onClick={() => onCreate(selectedDate)}>
              <Plus size={15} />
              <span>Crear para este día</span>
            </Button>
          )}
        </div>
        {!selected.length ? (
          <div className="party-day-empty panel">
            <span>
              <CalendarDays size={28} strokeWidth={1.3} />
            </span>
            <div>
              <strong>
                {feed.loading
                  ? "Buscando los planes de este mes…"
                  : "Este día tiene espacio para un buen plan."}
              </strong>
              <p>
                {selectedDate >= today
                  ? "Organiza una party o elige otro día marcado en el calendario."
                  : "No hay parties con estos filtros para la fecha seleccionada."}
              </p>
            </div>
          </div>
        ) : (
          <div className="party-day-agenda-list">
            {selected.map((game) => {
              const status = eventState(game, now);
              const host = [data.me, ...data.profiles].find(
                (person) => person.id === game.host_id,
              );
              const own = game.host_id === data.user?.id;
              const member = game.participants?.find(
                (p) => p.user_id === data.user?.id,
              );
              return (
                <article className="party-day-agenda-card panel" key={game.id}>
                  <div className="party-agenda-time">
                    <Clock size={15} />
                    <strong>{timeFormat(game.starts_at)}</strong>
                    <small>{game.holes} hoyos</small>
                  </div>
                  <div className="party-agenda-info">
                    <div className="party-agenda-tags">
                      <span className={`party-agenda-status ${status.key}`}>
                        {status.label}
                      </span>
                      <span>
                        {game.join_mode === "open"
                          ? "Party abierta"
                          : "Con aprobación"}
                      </span>
                    </div>
                    <h4>{clubName(game)}</h4>
                    <p>{game.description}</p>
                    <small>
                      Organiza {own ? "tu cuenta" : host?.name || "Golfista"} ·{" "}
                      {game.format}
                    </small>
                  </div>
                  <button
                    className="party-agenda-action"
                    onClick={() => onOpen(game)}
                  >
                    {own
                      ? "Administrar"
                      : member?.status === "confirmed"
                        ? "Ver mi grupo"
                        : member?.status === "requested"
                          ? "Ver mi solicitud"
                          : status.key === "available"
                            ? "Detalles y unirme"
                            : "Ver detalles"}
                    <ArrowUpRight size={16} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
