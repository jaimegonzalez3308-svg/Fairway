"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Flag,
  LayoutGrid,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { Button, Empty, SectionHeading } from "./ui";
import type { FairwayData } from "@/lib/use-fairway";
import type { Game } from "@/lib/domain";
import { dateFormat, timeFormat } from "@/lib/utils";
import {
  gameIsUpcoming,
  gameSeats,
  golfDate,
  golfDateAfter,
  matchesPartyPeriod,
  partyDateLabel,
  type PartyPeriod,
} from "@/lib/parties";

export function Parties({
  data,
  onCreate,
  onOpen,
}: {
  data: FairwayData;
  onCreate: () => void;
  onOpen: (game: Game) => void;
}) {
  const [tab, setTab] = useState("explore");
  const [calendar, setCalendar] = useState(false);
  const [period, setPeriod] = useState<PartyPeriod>("all");
  const [date, setDate] = useState(golfDateAfter(7));
  const [club, setClub] = useState("");
  const [openOnly, setOpenOnly] = useState(true);
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const refreshGames = data.refreshGames;
  useEffect(() => {
    const refresh = () => {
      if (document.hidden) return;
      setNow(new Date());
      void refreshGames();
    };
    const timer = setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refreshGames]);
  const mine = (g: Game) =>
    g.host_id === data.user?.id ||
    g.participants?.some(
      (p) =>
        p.user_id === data.user?.id &&
        ["confirmed", "requested"].includes(p.status),
    );
  const upcoming = data.games.filter((g) => gameIsUpcoming(g, now));
  const visible = (tab === "mine" ? data.games.filter(mine) : upcoming)
    .filter(
      (g) =>
        (!club || g.club_id === club) &&
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
  const dates = [...new Set(visible.map((g) => golfDate(g.starts_at)))];
  return (
    <>
      <SectionHeading
        eyebrow="LA BUENA COMPAÑÍA SE PLANEA"
        title="Ponle fecha a tu próxima ronda."
        description="Arma una party para mañana, la próxima semana o el día que quieras. Tu grupo empieza aquí."
        action={
          <Button onClick={onCreate}>
            <Plus size={17} />
            Crear party
          </Button>
        }
      />
      <section
        className="party-planner-hero"
        aria-label="Organiza una party con anticipación"
      >
        <div className="party-planner-copy">
          <span className="party-hero-eyebrow">
            <span className="live-dot" /> UN PLAN ABIERTO A BUENA COMPAÑÍA
          </span>
          <h2>
            Una fecha.
            <br />
            Un campo. <em>Tu próximo grupo.</em>
          </h2>
          <p>
            Publica tu ronda con anticipación. Los demás ven los lugares
            disponibles y se unen a tu party.
          </p>
          <Button onClick={onCreate}>
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
            <Check size={13} /> El plan lo pones tú.
          </div>
        </div>
      </section>
      <div className="party-board-heading">
        <div className="tabs">
          <button
            className={tab === "explore" ? "active" : ""}
            onClick={() => setTab("explore")}
          >
            Explorar partidas
          </button>
          <button
            className={tab === "mine" ? "active" : ""}
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
          </button>
          <button
            className={calendar ? "active" : ""}
            onClick={() => setCalendar(true)}
            aria-label="Ver calendario"
            aria-pressed={calendar}
          >
            <CalendarDays size={17} />
          </button>
        </div>
      </div>
      <div className="party-filters panel">
        <div className="party-date-filters" aria-label="Filtrar por fecha">
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
        <div className="party-filter-fields">
          {period === "date" && (
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
        </div>
      </div>
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
          title={
            tab === "mine"
              ? "Tu próxima ronda está por escribirse."
              : "Todavía hay espacio para un nuevo plan."
          }
          description={
            tab === "mine"
              ? "Aquí aparecerán las partidas que organices y aquellas a las que te unas. Prueba otra fecha si ya tienes un plan."
              : "No hay partidas con estos filtros. Elige otra fecha o publica tu propia party."
          }
          action={
            <Button variant="outline" onClick={onCreate}>
              <Plus size={16} />
              Crear un plan
            </Button>
          }
        />
      ) : calendar ? (
        <div className="party-calendar-list">
          {dates.map((day) => (
            <section key={day}>
              <h3>
                {new Intl.DateTimeFormat("es-MX", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: "America/Mexico_City",
                }).format(new Date(`${day}T12:00:00-06:00`))}
              </h3>
              <div className="panel">
                {visible
                  .filter((g) => golfDate(g.starts_at) === day)
                  .map((g) => (
                    <button
                      className="party-calendar-row"
                      key={g.id}
                      onClick={() => onOpen(g)}
                    >
                      <span className="party-calendar-hour">
                        {timeFormat(g.starts_at)}
                      </span>
                      <div>
                        <strong>
                          {data.clubs.find((c) => c.id === g.club_id)?.name ||
                            "Campo"}
                        </strong>
                        <small>
                          {g.join_mode === "open"
                            ? "Party abierta"
                            : "Con aprobación"}{" "}
                          · {g.holes} hoyos · {gameSeats(g).remaining} lugares
                          libres
                        </small>
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </div>
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
        {own
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
