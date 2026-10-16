"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import type { FairwayData } from "./use-fairway";
import type { Profile } from "./domain";
export type Friendship = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted";
  created_at: string;
};
export type FriendAction = "accept" | "reject" | "cancel" | "remove";
export async function profileWithPhoto(profile: Profile): Promise<Profile> {
  if (!profile.photo || profile.photo.startsWith("http") || !supabase)
    return profile;
  const { data } = await supabase.storage
    .from("profile-images")
    .createSignedUrl(profile.photo, 3600);
  return { ...profile, photo: data?.signedUrl || "" };
}
export function useFriends(data: FairwayData) {
  const [relations, setRelations] = useState<Friendship[]>([]),
    [people, setPeople] = useState<Profile[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [available, setAvailable] = useState(false),
    [busy, setBusy] = useState<string | null>(null);
  const current = useRef<string | null>(null);
  const generation = useRef(0);
  current.current = data.user?.id || null;
  const userId = data.user?.id;
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    if (!supabase || !userId) {
      setRelations([]);
      setPeople([]);
      setLoading(false);
      setAvailable(false);
      return;
    }
    const { data: rows, error } = await supabase
      .from("friendships")
      .select("id,requester_id,recipient_id,status,created_at")
      .order("created_at", { ascending: false });
    if (current.current !== userId || version !== generation.current) return;
    if (error) {
      setAvailable(false);
      setRelations([]);
      setPeople([]);
      setLoading(false);
      setError(
        ["42P01", "PGRST205"].includes(error.code)
          ? "Las amistades todavía no están activadas. Inténtalo más tarde."
          : "No pudimos cargar tus amistades. Revisa tu conexión e inténtalo de nuevo.",
      );
      return;
    }
    const ids = [
      ...new Set(
        (rows as Friendship[]).map((r) =>
          r.requester_id === userId ? r.recipient_id : r.requester_id,
        ),
      ),
    ];
    let profiles: Profile[] = [];
    if (ids.length) {
      const result = await supabase.from("profiles").select("*").in("id", ids);
      if (result.error) {
        if (current.current === userId && version === generation.current) {
          setError("No pudimos cargar los perfiles. Inténtalo de nuevo.");
          setLoading(false);
        }
        return;
      }
      profiles = await Promise.all(
        (result.data as Profile[]).map(profileWithPhoto),
      );
    }
    if (current.current !== userId || version !== generation.current) return;
    setRelations(rows as Friendship[]);
    setPeople(profiles);
    setError("");
    setAvailable(true);
    setLoading(false);
  }, [userId]);
  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!supabase || !userId) return;
    const channel = supabase
      .channel("friends-" + userId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + userId,
        },
        () => void refresh(),
      )
      .subscribe();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      void supabase!.removeChannel(channel);
    };
  }, [userId, refresh]);
  async function mutate(id: string, action?: FriendAction) {
    if (!supabase || !userId || busy) return false;
    setBusy(id);
    try {
      const result = action
        ? await supabase.rpc("respond_friendship", { friendship: id, action })
        : await supabase.rpc("request_friendship", { target: id });
      if (result.error) {
        data.notify(result.error.message);
        return false;
      }
      await refresh();
      data.notify(
        action === "accept"
          ? "Solicitud aceptada. ¡Ya son amigos!"
          : action === "reject"
            ? "Solicitud rechazada."
            : action === "cancel"
              ? "Solicitud cancelada."
              : action === "remove"
                ? "Amistad eliminada."
                : "Solicitud de amistad enviada.",
      );
      return true;
    } catch {
      data.notify(
        "No se pudo completar la solicitud. Revisa tu conexión y vuelve a intentarlo.",
      );
      return false;
    } finally {
      setBusy(null);
    }
  }
  return {
    relations,
    people,
    loading,
    error,
    available,
    busy,
    refresh,
    request: (id: string) => mutate(id),
    respond: (id: string, action: FriendAction) => mutate(id, action),
  };
}
export type FriendsData = ReturnType<typeof useFriends>;
