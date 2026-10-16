"use client";
import { useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import {
  demoMe,
  demoProfiles,
  clubs as demoClubs,
  demoGames,
  demoRounds,
} from "./demo";
import type { Profile, Club, Game, Round } from "./domain";
import { authErrorMessage } from "./auth";
const anonymousProfile: Profile = {
  id: "",
  name: "Mi cuenta",
  city: "León",
  age: 18,
  handicap: null,
  club_id: null,
  bio: "",
  availability: [],
  holes: 18,
  style: "social",
  photo: "",
  verified: false,
  accepts_guests: false,
  beginner_friendly: false,
};
export type Conversation = {
  id: string;
  match_id: string | null;
  game_id: string | null;
  conversation_members: { user_id: string; last_read_at: string }[];
};
export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
export type Notification = {
  id: string;
  title: string;
  category: string;
  read: boolean;
  created_at: string;
};
export function useFairway() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(!!supabase),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [me, setMe] = useState<Profile>(supabase ? anonymousProfile : demoMe),
    [profiles, setProfiles] = useState<Profile[]>(supabase ? [] : demoProfiles),
    [clubs, setClubs] = useState<Club[]>(supabase ? [] : demoClubs),
    [games, setGames] = useState<Game[]>(supabase ? [] : demoGames),
    [rounds, setRounds] = useState<Round[]>(supabase ? [] : demoRounds),
    [decided, setDecided] = useState<string[]>([]),
    [favorites, setFavorites] = useState<string[]>([]),
    [conversations, setConversations] = useState<Conversation[]>([]),
    [messages, setMessages] = useState<Message[]>([]),
    [notifications, setNotifications] = useState<Notification[]>([]),
    [admin, setAdmin] = useState(false);
  const [publicDirectoryLive, setPublicDirectoryLive] = useState(false);
  const demo = !supabase;
  useEffect(() => {
    if (!supabase || user) return;
    let current = true;
    void supabase
      .from("clubs")
      .select("id,name,city,verified,description,access_info")
      .order("name")
      .then(({ data, error }) => {
        if (!current) return;
        setPublicDirectoryLive(!error);
        setClubs(error ? demoClubs : (data as Club[]));
      });
    return () => {
      current = false;
    };
  }, [user]);
  const notify = useCallback((s: string) => {
    setToast(s);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const load = useCallback(async (u: User) => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    try {
      const r = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("clubs").select("*"),
        supabase
          .from("games")
          .select("*,participants:game_participants(user_id,status)")
          .order("starts_at"),
        supabase
          .from("rounds")
          .select("*")
          .eq("user_id", u.id)
          .order("played_at"),
        supabase.from("decisions").select("target_id").eq("actor_id", u.id),
        supabase.from("favorites").select("target_id").eq("user_id", u.id),
        supabase
          .from("conversations")
          .select("*,conversation_members(user_id,last_read_at)"),
        supabase.from("messages").select("*").order("created_at"),
        supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("account_roles")
          .select("is_admin,suspended")
          .eq("user_id", u.id)
          .single(),
        supabase.rpc("rating_summary"),
      ]);
      const failed = r.find((x) => x.error);
      if (failed?.error) throw failed.error;
      const all = r[0].data as Profile[];
      const own = all.find((x) => x.id === u.id);
      if (!own)
        throw new Error(
          "No se encontró tu perfil. Revisa la migración y el estado de la cuenta.",
        );
      const photos = await Promise.all(
        all.map(async (p) => {
          if (!p.photo || p.photo.startsWith("http")) return p;
          const { data } = await supabase!.storage
            .from("profile-images")
            .createSignedUrl(p.photo, 3600);
          return { ...p, photo: data?.signedUrl || "" };
        }),
      );
      const ratings = r[10].data as {
        user_id: string;
        rating: number;
        review_count: number;
      }[];
      setMe(photos.find((p) => p.id === u.id) || own);
      setProfiles(
        photos
          .filter((x) => x.id !== u.id)
          .map((p) => ({ ...p, ...ratings.find((x) => x.user_id === p.id) })),
      );
      setClubs(r[1].data as Club[]);
      setGames(r[2].data as Game[]);
      setRounds(r[3].data as Round[]);
      setDecided(r[4].data!.map((x) => x.target_id));
      setFavorites(r[5].data!.map((x) => x.target_id));
      setConversations(r[6].data as Conversation[]);
      setMessages(r[7].data as Message[]);
      setNotifications(r[8].data as Notification[]);
      setAdmin(!!r[9].data?.is_admin);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : (e as { message?: string }).message ||
              "No se pudieron cargar los datos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) setError(authErrorMessage(error));
        setUser(data.session?.user ?? null);
        if (data.session?.user) void load(data.session.user);
        else setLoading(false);
      })
      .catch(() => {
        setError(
          "No se pudo recuperar la sesión. Revisa tu conexión y recarga la página.",
        );
        setLoading(false);
      });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      if (s?.user) setTimeout(() => void load(s.user), 0);
      else {
        setMe(anonymousProfile);
        setDecided([]);
        setFavorites([]);
        setNotifications([]);
        setAdmin(false);
        setError("");
        setProfiles([]);
        setGames([]);
        setRounds([]);
        setConversations([]);
        setMessages([]);
        setLoading(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [load]);
  useEffect(() => {
    if (!supabase || !user) return;
    const channel = supabase
      .channel("fairway-" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => void load(user),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => void load(user),
      )
      .subscribe();
    return () => {
      void supabase!.removeChannel(channel);
    };
  }, [user, load]);
  async function run(
    fn: () => PromiseLike<{ error: unknown; data?: unknown }>,
    success?: string,
  ) {
    if (!supabase || !user) {
      notify(
        demo
          ? "Demostración: conecta Supabase e inicia sesión para guardar cambios reales."
          : "Inicia sesión para continuar.",
      );
      return false;
    }
    try {
      const result = await fn();
      if (result.error) {
        notify(
          (result.error as { message?: string }).message ||
            "No se pudo completar la acción.",
        );
        return false;
      }
      if (success) notify(success);
      await load(user);
      return true;
    } catch (e) {
      notify(
        e instanceof Error
          ? e.message
          : "Conexión no disponible. Intenta de nuevo.",
      );
      return false;
    }
  }
  async function decide(id: string, choice: string) {
    if (demo) {
      setDecided((x) => [...x, id]);
      notify("Demostración: decisión temporal. No se generó un match real.");
      return;
    }
    if (!supabase || !user) return;
    const { data, error } = await supabase.rpc("decide", {
      target: id,
      choice,
    });
    if (error) {
      notify(error.message);
      return;
    }
    setDecided((x) => [...x, id]);
    notify(
      data
        ? "¡Es un match! Ya pueden conversar."
        : choice === "like"
          ? "Like enviado. Habrá match si el interés es mutuo."
          : "Perfil omitido.",
    );
    await load(user);
  }
  async function favorite(id: string) {
    if (demo) {
      setFavorites((x) =>
        x.includes(id) ? x.filter((i) => i !== id) : [...x, id],
      );
      return;
    }
    await run(() =>
      favorites.includes(id)
        ? supabase!
            .from("favorites")
            .delete()
            .eq("user_id", user!.id)
            .eq("target_id", id)
        : supabase!
            .from("favorites")
            .insert({ user_id: user!.id, target_id: id }),
    );
  }
  return {
    user,
    demo,
    loading,
    error,
    toast,
    notify,
    me,
    profiles,
    clubs,
    games,
    rounds,
    decided,
    favorites,
    conversations,
    messages,
    notifications,
    admin,
    publicDirectoryLive,
    run,
    decide,
    favorite,
    reload: () => user && load(user),
  };
}
export type FairwayData = ReturnType<typeof useFairway>;
