"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock,
  Flag,
  LayoutGrid,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { Button, Empty, SectionHeading, ThumbAction } from "./ui";
import { PartyMonthCalendar } from "./party-month-calendar";
import type { FairwayData } from "@/lib/use-fairway";
import type { Game } from "@/lib/domain";
import { canRatePlayer } from "@/lib/ratings";
import { CourseIcon } from "./course-icon";
import { CityFilter } from "./city-field";
import { gameMatchesCity } from "@/lib/cities";
import { dateFormat, timeFormat } from "@/lib/utils";
import {
  gameIsUpcoming,
  gameSeats,
  golfDateAfter,
  matchesPartyPeriod,
  partyDateLabel,
  type PartyPeriod,
} from "@/lib/parties";

function PartyFilters({
  compact,
  children,
}: {
  compact: boolean;
  children: ReactNode;
}) {
  return compact ? (
    <details className="native-filter-disclosure native-party-filters">
      <summary>Filtrar por ciudad, campo y fecha</summary>
      {children}
    </details>
  ) : (
    <>{children}</>
  );
}

export function Parties({
  data,
  onCreate,
  onOpen,
  calendarDate,
  onCalendarDateChange,
  cityScope = "any",
  onCityScopeChange,
  compact = false,
}: {
  data: FairwayData;
  onCreate: (date?: string) => void;
  calendarDate: string;
  onCalendarDateChange: (date: string) => void;
  onOpen: (game: Game) => void;
  cityScope?: string;
  onCityScopeChange?: (scope: string) => void;
  compact?: boolean;
}) {
  const [tab, setTab] = useState("explore");
  const [calendar, setCalendar] = useState(!compact);
  const [period, setPeriod] = useState<PartyPeriod>("all");
  const [date, setDate] = useState(golfDateAfter(7));
  const [club, setClub] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const refreshGames = data.refreshGames;
  useEffect(() => {
    const refresh = () => {
      if (document.hidden) return;
      setNow(new Date());
      if (!calendar) void refreshGames();
    };
    const timer = setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refreshGames, calendar]);
  const mine = (g: Game) =>
    g.host_id === data.user?.id ||
    g.participants?.some(
      (p) =>
        p.user_id === data.user?.id &&
        ["confirmed", "requested"].includes(p.status),
    );
  const upcoming = data.games.filter((g) => gameIsUpcoming(g, now));
  const pendingReviews = data.games
    .filter((game) =>
      game.participants?.some(
        (p) =>
          data.profiles.some((profile) => profile.id === p.user_id) &&
          canRatePlayer(game, data.user?.id, p.user_id, data.myReviews),
      ),
    )
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const visible = (tab === "mine" ? data.games.filter(mine) : upcoming)
    .filter(
      (g) =>
        (!club || g.club_id === club) &&
        (tab === "mine" ||
          gameMatchesCity(g, data.clubs, cityScope, data.me.city)) &&
        matchesPartyPeriod(g, period, date, now) &&
        (tab === "mine" ||
          !openOnly ||
          (g.status === "open" && gameSeats(g).remaining > 0)),
    )
    .sort((a, b) => {
      if (tab === "mine") {
        const future =
          Number(gameIsUpcoming(b, now)) - Number(gameIsUpcoming(a, now));
        if (future) return future;
      }
      return a.starts_at.localeCompare(b.starts_at);
    });
  return (
    <>
      <SectionHeading
        eyebrow="CALENDARIO DE PARTIDAS"
        title={compact ? "Tu próxima ronda" : "Ponle fecha a tu próxima ronda."}
        description={
          compact
            ? "Busca un lugar o invita a tu grupo."
            : "Explora las parties del mes, elige un día y encuentra tu próxima ronda. También puedes organizar la tuya."
        }
        action={
          <ThumbAction onClick={() => onCreate()}>
            <CourseIcon part="tee" size={19} />
            Crear party
          </ThumbAction>
        }
      />
      {!calendar && !compact && (
        <section
          className="party-planner-hero"
          aria-label="Organiza una party con anticipación"
        >
          <div className="party-planner-copy">
            <span className="party-hero-eyebrow">
              <span className="live-dot" /> INVITA A OTROS GOLFISTAS
            </span>
            <h2>
              Publica una partida
              <br />
              <em>con lugares disponibles.</em>
            </h2>
            <p>
              Publica tu ronda con anticipación. Los demás ven los lugares
              disponibles y se unen a tu party.
            </p>
            <Button onClick={() => onCreate()}>
              Armar mi party
              <ArrowUpRight size={17} />
            </Button>
          </div>
          <div className="party-planner-illustration" aria-hidden="true">
            <div className="party-calendar-leaf">
              <span>LA PRÓXIMA SEMANA</span>
              <strong>{golfDateAfter(7).slice(-2)}</strong>
              <small>
                {new Intl.DateTimeFormat("es-MX", {
                  month: "long",
                  timeZone: "America/Mexico_City",
                }).format(new Date(`${golfDateAfter(7)}T12:00:00-06:00`))}
              </small>
            </div>
            <div className="party-hero-group">
              <span>
                <Flag size={20} />
              </span>
              <span>
                <Users size={19} />
              </span>
              <span>
                <Plus size={18} />
              </span>
              <span>
                <Plus size={18} />
              </span>
            </div>
            <div className="party-hero-note">
              <Check size={13} /> Comparte campo, fecha y hora.
            </div>
          </div>
        </section>
      )}
      {pendingReviews.length > 0 && (
        <section
          className="panel review-reminder"
          aria-label="Calificaciones pendientes"
        >
          <h3>Tienes compañeros por calificar</h3>
          <p>
            Abre una partida finalizada y comparte cómo fue jugar con tu grupo.
          </p>
          <div className="button-row">
            {pendingReviews.slice(0, 3).map((game) => (
              <Button
                key={game.id}
                variant="outline"
                onClick={() => onOpen(game)}
              >
                Calificar ·{" "}
                {data.clubs.find((club) => club.id === game.club_id)?.name ||
                  "Partida"}{" "}
                · {dateFormat(game.starts_at)}
              </Button>
            ))}
          </div>
        </section>
      )}
      <div className="party-board-heading">
        <div className="tabs">
          <button
            className={tab === "explore" ? "active" : ""}
            aria-pressed={tab === "explore"}
            onClick={() => setTab("explore")}
          >
            Explorar partidas
          </button>
          <button
            className={tab === "mine" ? "active" : ""}
            aria-pressed={tab === "mine"}
            onClick={() => setTab("mine")}
          >
            Mis planes <span>{data.games.filter(mine).length}</span>
          </button>
        </div>
        <div className="party-view-switch" aria-label="Vista de partidas">
          <button
            className={!calendar ? "active" : ""}
            onClick={() => setCalendar(false)}
            aria-label="Ver tarjetas"
            aria-pressed={!calendar}
          >
            <LayoutGrid size={17} />
            <span>Tarjetas</span>
          </button>
          <button
            className={calendar ? "active" : ""}
            onClick={() => setCalendar(true)}
            aria-label="Ver calendario mensual"
            aria-pressed={calendar}
          >
            <CalendarDays size={17} />
            <span>Calendario</span>
          </button>
        </div>
      </div>
      <PartyFilters compact={compact}>
        <div className={`party-filter-sheet ${calendar ? "is-month" : ""}`}>
          {tab === "explore" && onCityScopeChange && (
            <div className="city-explore-filter">
              <CityFilter
                scope={cityScope}
                ownCity={data.me.city}
                cities={data.clubs.map((club) => club.city)}
                onChange={(scope) => {
                  setClub("");
                  onCityScopeChange(scope);
                }}
              />
            </div>
          )}
          <div className={`party-filters panel ${calendar ? "is-month" : ""}`}>
            {!calendar && (
              <div
                className="party-date-filters"
                aria-label="Filtrar por fecha"
              >
                {(
                  [
                    ["all", "Cualquier fecha"],
                    ["today", "Hoy"],
                    ["week", "Próximos 7 días"],
                    ["next-week", "En 7–14 días"],
                    ["date", "Elegir día"],
                  ] as [PartyPeriod, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    className={period === value ? "active" : ""}
                    aria-pressed={period === value}
                    onClick={() => setPeriod(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="party-filter-fields">
              {!calendar && period === "date" && (
                <label>
                  <span>Fecha de la ronda</span>
                  <input
                    aria-label="Fecha de la ronda"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
              )}
              <label>
                <span>Campo</span>
                <select
                  aria-label="Filtrar partidas por campo"
                  value={club}
                  onChange={(e) => setClub(e.target.value)}
                >
                  <option value="">Todos los campos</option>
                  {data.clubs.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {tab === "explore" && (
                <label className="party-open-filter">
                  <input
                    type="checkbox"
                    checked={openOnly}
                    onChange={(e) => setOpenOnly(e.target.checked)}
                  />
                  Solo con lugares
                </label>
              )}
              {!calendar && (
                <button
                  className="party-refresh"
                  disabled={refreshing || data.demo}
                  aria-label="Actualizar partidas"
                  onClick={async () => {
                    setRefreshing(true);
                    try {
                      if (!(await refreshGames()))
                        data.notify(
                          "No pudimos actualizar las partidas. Revisa tu conexión.",
                        );
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                >
                  <RefreshCw size={15} />
                  {refreshing ? "Actualizando…" : "Actualizar"}
                </button>
              )}
            </div>
          </div>
        </div>
      </PartyFilters>
      {calendar ? (
        <PartyMonthCalendar
          data={data}
          selectedDate={calendarDate}
          onDateChange={onCalendarDateChange}
          onCreate={onCreate}
          onOpen={onOpen}
          mine={tab === "mine"}
          club={club}
          openOnly={tab === "mine" ? false : openOnly}
          now={now}
          cityScope={cityScope}
        />
      ) : (
        <>
          <div className="party-results-heading">
            <strong>
              {visible.length} {visible.length === 1 ? "plan" : "planes"}
              {tab === "mine" ? " en tu agenda" : " para compartir el campo"}
            </strong>
            <span>
              <Clock size={12} />
              Hora de León · UTC−6
            </span>
          </div>
          {!visible.length ? (
            <Empty
              icon={<CourseIcon part="bunker" size={32} />}
              title={
                tab === "mine"
                  ? "Tu próxima ronda está por escribirse."
                  : "Todavía hay espacio para un nuevo plan."
              }
              description="No hay partidas con estos filtros. Elige otra fecha o publica tu propia party."
              action={
                <Button variant="outline" onClick={() => onCreate()}>
                  <Plus size={16} />
                  Crear un plan
                </Button>
              }
            />
          ) : (
            <div className="party-card-grid">
              {visible.map((game) => (
                <PartyCard
                  key={game.id}
                  game={game}
                  data={data}
                  onOpen={() => onOpen(game)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function PartyCard({
  game,
  data,
  onOpen,
}: {
  game: Game;
  data: FairwayData;
  onOpen: () => void;
}) {
  const host = [data.me, ...data.profiles].find((p) => p.id === game.host_id);
  const { confirmed, remaining } = gameSeats(game);
  const own = game.host_id === data.user?.id;
  const member = game.participants?.find((p) => p.user_id === data.user?.id);
  const upcoming = gameIsUpcoming(game);
  const direct = game.join_mode === "open";
  const people = [data.me, ...data.profiles];
  const players = (game.participants || [])
    .filter(
      (p, i, all) =>
        p.status === "confirmed" &&
        all.findIndex((other) => other.user_id === p.user_id) === i,
    )
    .map((p) => people.find((profile) => profile.id === p.user_id))
    .filter((profile): profile is (typeof people)[number] => !!profile);
  return (
    <article className={`party-card panel ${!remaining ? "is-full" : ""}`}>
      <div className="party-card-heading">
        <span className={`party-kind-badge ${direct ? "is-open" : ""}`}>
          {direct ? <Users size={13} /> : <Check size={13} />}
          {direct ? "Party abierta" : "Con aprobación"}
        </span>
        <span className="party-day-label">
          {upcoming
            ? partyDateLabel(game.starts_at)
            : game.status === "cancelled"
              ? "Cancelada"
              : game.status === "finished"
                ? "Finalizada"
                : "Ya comenzó"}
        </span>
      </div>
      <h3>
        {data.clubs.find((c) => c.id === game.club_id)?.name || "Campo de golf"}
      </h3>
      <div className="party-card-when">
        <span>
          <CalendarDays size={14} />
          {dateFormat(game.starts_at)}
        </span>
        <span>
          <Clock size={14} />
          {timeFormat(game.starts_at)}
        </span>
        <span>{game.holes} hoyos</span>
      </div>
      <p className="party-card-description">{game.description}</p>
      <div className="party-card-host">
        <span className="party-small-avatar">
          {host?.photo ? (
            <img src={host.photo} alt="" />
          ) : (
            host?.name.charAt(0) || "G"
          )}
        </span>
        <span>
          Organiza <strong>{own ? "Tú" : host?.name || "Golfista"}</strong>
        </span>
        <span className="party-card-format">{game.format}</span>
      </div>
      <div className="party-card-seats">
        {/* Who is playing, as overlapping faces with a +N count. */}
        <div className="party-avatar-stack" aria-hidden="true">
          {players.slice(0, 3).map((player) => (
            <span className="party-small-avatar" key={player.id}>
              {player.photo ? (
                <img src={player.photo} alt="" />
              ) : (
                player.name.charAt(0)
              )}
            </span>
          ))}
          {players.length > 3 && (
            <span className="party-avatar-more">+{players.length - 3}</span>
          )}
        </div>
        <div
          className="party-seat-icons"
          aria-label={`${confirmed} de ${game.capacity} jugadores confirmados`}
        >
          {Array.from({ length: game.capacity }, (_, i) => (
            <span className={i < confirmed ? "filled" : ""} key={i}>
              {i < confirmed ? <Users size={13} /> : <Plus size={13} />}
            </span>
          ))}
        </div>
        <span>
          <strong>
            {confirmed}/{game.capacity}
          </strong>
          {remaining
            ? `${remaining} ${remaining === 1 ? "lugar libre" : "lugares libres"}`
            : "Grupo completo"}
        </span>
      </div>
      <button className="party-card-action" onClick={onOpen}>
        {game.status === "finished" &&
        game.participants?.some(
          (p) =>
            data.profiles.some((profile) => profile.id === p.user_id) &&
            canRatePlayer(game, data.user?.id, p.user_id, data.myReviews),
        )
          ? "Calificar compañeros"
          : own
            ? "Administrar mi plan"
            : member?.status === "confirmed"
              ? "Ver mi grupo"
              : member?.status === "requested"
                ? "Ver mi solicitud"
                : direct && remaining && upcoming
                  ? "Ver party y unirme"
                  : "Ver partida"}
        <ArrowUpRight size={16} />
      </button>
      {own || member?.status === "confirmed" ? (
        <span className="party-my-status">
          <Check size={12} />
          {own ? "Eres el organizador" : "Tu lugar está confirmado"}
        </span>
      ) : null}
    </article>
  );
}
