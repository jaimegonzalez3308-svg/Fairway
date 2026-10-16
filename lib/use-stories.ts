"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import type { FairwayData } from "./use-fairway";
import {
  STORY_FEED_SELECT,
  storyFromFeedRow,
  type Story,
  type StoryFeedRow,
} from "./stories";

export function useStories(data: FairwayData) {
  const userId = data.user?.id;
  const current = useRef(userId);
  current.current = userId;
  const generation = useRef(0);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    if (!supabase || !userId) {
      setStories([]);
      setLoading(false);
      setAvailable(false);
      return;
    }
    try {
      const result = await supabase
        .from("stories")
        .select(STORY_FEED_SELECT)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(500);
      if (current.current !== userId || version !== generation.current) return;
      if (result.error) {
        setAvailable(false);
        setStories([]);
        setError(
          ["42P01", "PGRST205"].includes(result.error.code)
            ? "Las historias todavía no están activadas."
            : "No pudimos cargar las historias. Inténtalo de nuevo.",
        );
      } else {
        setStories(
          (result.data as unknown as StoryFeedRow[]).map(storyFromFeedRow),
        );
        setAvailable(true);
        setError("");
      }
    } catch {
      if (current.current !== userId || version !== generation.current) return;
      setError("Revisa tu conexión para cargar las historias.");
    } finally {
      if (current.current === userId && version === generation.current)
        setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    setLoading(true);
    setStories([]);
    void refresh();
    const interval = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 30000);
    const focus = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", focus);
    window.addEventListener("online", focus);
    return () => {
      generation.current++;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", focus);
      window.removeEventListener("online", focus);
    };
  }, [refresh]);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  // Storage se limpia con su API, nunca borrando directamente storage.objects.
  useEffect(() => {
    if (!available || !userId || !supabase) return;
    let cancelled = false;
    void (async () => {
      const result = await supabase!.storage.from("story-images").list(userId, {
        limit: 100,
        sortBy: { column: "created_at", order: "asc" },
      });
      if (cancelled || current.current !== userId || result.error) return;
      // El vencimiento empieza al publicar, que puede ocurrir después de la subida.
      const live = await supabase!
        .from("stories")
        .select("media_path")
        .eq("user_id", userId);
      if (cancelled || current.current !== userId || live.error) return;
      const activePaths = new Set(live.data.map((s) => s.media_path));
      const expired = (result.data || []).filter(
        (f) =>
          f.created_at &&
          !activePaths.has(`${userId}/${f.name}`) &&
          new Date(f.created_at).getTime() < Date.now() - 24 * 3600000,
      );
      if (expired.length)
        await supabase!.storage
          .from("story-images")
          .remove(expired.map((f) => `${userId}/${f.name}`));
    })();
    return () => {
      cancelled = true;
    };
  }, [available, userId]);
  return {
    stories: stories.filter((s) => new Date(s.expires_at).getTime() > now),
    loading,
    available,
    error,
    refresh,
    markSeen: (storyId: string) =>
      setStories((rows) =>
        rows.map((s) =>
          s.id !== storyId ||
          !userId ||
          s.story_views.some((v) => v.user_id === userId)
            ? s
            : {
                ...s,
                story_views: [
                  ...s.story_views,
                  { user_id: userId, viewed_at: new Date().toISOString() },
                ],
              },
        ),
      ),
    setLiked: (storyId: string, liked: boolean) =>
      setStories((rows) =>
        rows.map((s) =>
          s.id !== storyId || !userId
            ? s
            : {
                ...s,
                story_likes: [
                  ...s.story_likes.filter((v) => v.user_id !== userId),
                  ...(liked ? [{ user_id: userId }] : []),
                ],
              },
        ),
      ),
  };
}
