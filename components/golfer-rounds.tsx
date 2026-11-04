"use client";
import { useEffect, useState } from "react";
import { summarize, type Club, type Round } from "@/lib/domain";
import { supabase } from "@/lib/supabase";

/** "2026-11-02" as a local calendar date (never shifted by time zone). */
export function roundDateLabel(value: string) {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(day.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(day);
}

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; rounds: Round[] };

/** Another golfer's recent published rounds. The database decides what is
 * visible (rounds RLS: published and readable for their privacy), so this
 * shows only what that golfer chose to share with you. */
export function GolferRounds({
  userId,
  name,
  clubs,
}: {
  userId: string;
  name: string;
  clubs: Club[];
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    let current = true;
    setState({ status: "loading" });
    if (!supabase) {
      setState({ status: "ready", rounds: [] });
      return;
    }
    void supabase
      .from("rounds")
      .select(
        "id,user_id,club_id,played_at,holes,tee,course,status,privacy,verified,scores",
      )
      .eq("user_id", userId)
      .eq("status", "published")
      .order("played_at", { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (!current) return;
        setState(
          error
            ? { status: "error" }
            : { status: "ready", rounds: (data || []) as Round[] },
        );
      });
    return () => {
      current = false;
    };
  }, [userId]);
  const first = name.split(" ")[0] || name;
  return (
    <section className="golfer-rounds" aria-label={`Rondas de ${name}`}>
      <h3>Rondas recientes</h3>
      {state.status === "loading" && (
        <p className="muted" role="status">
          Cargando rondas…
        </p>
      )}
      {state.status === "error" && (
        <p className="muted">No pudimos cargar sus rondas.</p>
      )}
      {state.status === "ready" && !state.rounds.length && (
        <p className="muted">{first} todavía no comparte rondas contigo.</p>
      )}
      {state.status === "ready" && state.rounds.length > 0 && (
        <ul>
          {state.rounds.map((round) => {
            const summary = summarize(round.scores || []);
            const club =
              clubs.find((c) => c.id === round.club_id)?.name ||
              round.course ||
              "Campo de golf";
            return (
              <li key={round.id}>
                <span>
                  <strong>{club}</strong>
                  <small>
                    {roundDateLabel(round.played_at)} · {round.holes} hoyos
                  </small>
                </span>
                <span className="golfer-round-score">
                  <strong>{summary.total || "—"}</strong>
                  {summary.relative !== null && summary.complete && (
                    <small>
                      {summary.relative === 0
                        ? "Par"
                        : summary.relative > 0
                          ? `+${summary.relative}`
                          : summary.relative}
                    </small>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
