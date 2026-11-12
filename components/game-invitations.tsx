"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/domain";
import { invitationStatuses, invitationSummary } from "@/lib/party-repeat";
import { Button } from "./ui";

type Loaded =
  | { key: string; status: "ready"; invitations: { invitee_id: string }[] }
  | { key: string; status: "error" };

/** The organizer's view of who they invited and where each person stands.
 * Read-only: it never sends, retries or changes anything. Sender access is
 * already granted by the read_own_invitation policy. */
export function GameInvitations({
  gameId,
  userId,
  participants,
  profiles,
  refresh = 0,
  client = supabase,
}: {
  gameId: string;
  userId: string;
  participants?: { user_id: string; status: string }[];
  profiles: Pick<Profile, "id" | "name">[];
  /** Bump after sending an invitation to read the list again. */
  refresh?: number;
  client?: typeof supabase;
}) {
  // A refresh keeps the current list on screen; another game or account never
  // shows the previous one.
  const key = `${gameId}:${userId}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!client) return;
    let current = true;
    void Promise.resolve(
      client
        .from("game_invitations")
        .select("invitee_id,created_at")
        .eq("game_id", gameId)
        .eq("sender_id", userId)
        .order("created_at", { ascending: true }),
    ).then(
      ({ data, error }) => {
        // Ignore answers for another game, account or an older refresh.
        if (!current) return;
        setLoaded(
          error
            ? { key, status: "error" }
            : {
                key,
                status: "ready",
                invitations: (data ?? []) as { invitee_id: string }[],
              },
        );
      },
      () => {
        if (current) setLoaded({ key, status: "error" });
      },
    );
    return () => {
      current = false;
    };
  }, [client, gameId, userId, key, refresh, retry]);

  // Until this game's answer arrives, show nothing rather than a stale list.
  if (!loaded || loaded.key !== key)
    return (
      <p className="party-invite-empty" role="status">
        Cargando invitados…
      </p>
    );
  if (loaded.status === "error")
    return (
      <div className="party-invited">
        <p className="party-invite-empty" role="status">
          No pudimos cargar a quién invitaste.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setLoaded(null);
            setRetry((n) => n + 1);
          }}
        >
          Reintentar cargar invitados
        </Button>
      </div>
    );
  const rows = invitationStatuses(loaded.invitations, participants, profiles);
  if (!rows.length) return null;
  return (
    <section className="party-invited" aria-labelledby={`invited-${gameId}`}>
      <h3 id={`invited-${gameId}`}>Invitados</h3>
      <p className="party-invite-empty">{invitationSummary(rows)}</p>
      {rows.map((row) => (
        <div className="list-row" key={row.id}>
          <span>{row.name}</span>
          <span className="badge">{row.label}</span>
        </div>
      ))}
    </section>
  );
}
