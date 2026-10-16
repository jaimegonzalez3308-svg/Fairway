"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import type { FairwayData } from "./use-fairway";
import type { Game } from "./domain";
import { calendarMonthBounds, gamesInCalendarMonth } from "./party-calendar";

export function usePartyMonth(month: string, data: FairwayData) {
  const userId = data.user?.id;
  const current = useRef({ month, userId });
  current.current = { month, userId };
  const generation = useRef(0);
  const [result, setResult] = useState<{
    month: string;
    userId: string;
    games: Game[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!supabase || !userId) return;
    const version = ++generation.current;
    const valid = () =>
      current.current.month === month &&
      current.current.userId === userId &&
      generation.current === version;
    setLoading(true);
    try {
      const bounds = calendarMonthBounds(month);
      const rows = new Map<string, Game>();
      // Consultar el mes por páginas evita omitir eventos por el límite general del feed.
      for (let offset = 0; ; offset += 200) {
        const response = await supabase
          .from("games")
          .select("*,participants:game_participants(user_id,status)")
          .gte("starts_at", bounds.start)
          .lt("starts_at", bounds.end)
          .order("starts_at")
          .order("id")
          .range(offset, offset + 199);
        if (!valid()) return;
        if (response.error) throw response.error;
        for (const game of response.data as Game[]) rows.set(game.id, game);
        if (response.data.length < 200) break;
      }
      setResult({ month, userId, games: [...rows.values()] });
      setError("");
    } catch {
      if (valid())
        setError(
          "No pudimos actualizar este mes. Revisa tu conexión e inténtalo de nuevo.",
        );
    } finally {
      if (valid()) setLoading(false);
    }
  }, [month, userId]);
  useEffect(() => {
    setError("");
    void refresh();
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    const timer = setInterval(visible, 30000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    return () => {
      generation.current++;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
    };
  }, [refresh]);
  return {
    games:
      result?.month === month && result.userId === userId
        ? result.games
        : gamesInCalendarMonth(data.games, month),
    loading,
    error,
    refresh,
  };
}
