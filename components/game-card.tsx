"use client";
import { ArrowUpRight, CalendarDays, Clock, Flag } from "lucide-react";
import type { Game } from "@/lib/domain";
import { dateFormat, timeFormat } from "@/lib/utils";
import { statusLabel } from "./member-primitives";

export function GameCard({
  game: g,
  club,
  onOpen,
}: {
  game: Game;
  club: string;
  onOpen: () => void;
}) {
  const confirmed =
    g.participants?.filter((p) => p.status === "confirmed").length || 1;
  return (
    <article className="game-card">
      <div className="game-icon">
        <Flag size={23} strokeWidth={1.5} />
      </div>
      <div className="game-card-content">
        <div className="game-card-top">
          <span className="eyebrow">
            {g.status === "open"
              ? `BUSCAMOS ${g.capacity - confirmed} ${g.capacity - confirmed === 1 ? "JUGADOR" : "JUGADORES"}`
              : statusLabel(g.status)}
          </span>
          <span className="game-type">{g.holes} hoyos</span>
        </div>
        <h3>{club}</h3>
        <p>
          <CalendarDays size={13} />
          {dateFormat(g.starts_at)}
          <i /> <Clock size={13} />
          {timeFormat(g.starts_at)}
        </p>
        <div className="game-card-bottom">
          <div className="participant-preview">
            <span>
              {confirmed}/{g.capacity}
            </span>
            Jugadores confirmados
          </div>
          <button onClick={onOpen}>
            Ver partida
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
