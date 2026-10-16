"use client";
import { useState } from "react";
import { ArrowRight, Check, LogOut, MessageCircle } from "lucide-react";
import type { Game } from "@/lib/domain";
import type { FairwayData } from "@/lib/use-fairway";
import { gameIsUpcoming, gameSeats } from "@/lib/parties";
import { supabase } from "@/lib/supabase";
import { Button, Modal } from "./ui";

export function GameJoinActions({
  game,
  data,
  onChat,
}: {
  game: Game;
  data: FairwayData;
  onChat: (id: string) => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const membership = game.participants?.find(
    (p) => p.user_id === data.user?.id,
  );
  const own = game.host_id === data.user?.id;
  const conversation = data.conversations.find((c) => c.game_id === game.id);
  const direct = game.join_mode === "open";
  const upcoming = gameIsUpcoming(game);
  const canLeave = !own && upcoming && data.partiesAvailable;
  async function leave() {
    if (busy) return;
    setBusy(true);
    try {
      if (
        await data.run(
          () => supabase!.rpc("leave_game", { g: game.id }),
          membership?.status === "requested"
            ? "Solicitud cancelada."
            : "Saliste de la partida. Tu lugar vuelve a estar disponible.",
        )
      ) {
        setLeaving(false);
        setAcknowledged(false);
      }
    } finally {
      setBusy(false);
    }
  }
  if (own || membership?.status === "confirmed")
    return (
      <div className="party-membership-actions">
        {!own && (
          <div className="party-confirmed-notice">
            <Check size={18} />
            <div>
              <strong>Tu lugar está confirmado.</strong>
              <span>Coordina la ronda con tu grupo en el chat.</span>
            </div>
          </div>
        )}
        {conversation && (
          <Button variant="outline" onClick={() => onChat(conversation.id)}>
            <MessageCircle size={16} />
            Abrir chat del grupo
          </Button>
        )}
        {canLeave && (
          <button
            className="party-leave-button"
            disabled={busy}
            onClick={() => setLeaving(true)}
          >
            <LogOut size={14} />
            Salir de la partida
          </button>
        )}
        {leaving && (
          <Modal
            title="¿Liberar tu lugar?"
            onClose={() => {
              if (!busy) setLeaving(false);
            }}
          >
            <p>
              Saldrás del grupo y de su chat. Si la party es abierta, otra
              persona podrá ocupar tu lugar.
            </p>
            <div className="button-row">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setLeaving(false)}
              >
                Conservar mi lugar
              </Button>
              <Button disabled={busy} onClick={() => void leave()}>
                {busy ? "Saliendo…" : "Salir y liberar lugar"}
              </Button>
            </div>
          </Modal>
        )}
      </div>
    );
  if (membership?.status === "requested")
    return (
      <div className="party-membership-actions">
        <div className="notice">
          Solicitud enviada. El organizador debe aprobarla para confirmar tu
          lugar.
        </div>
        {canLeave && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void leave()}
          >
            {busy ? "Cancelando…" : "Cancelar mi solicitud"}
          </Button>
        )}
      </div>
    );
  if (membership?.status === "rejected")
    return (
      <div className="notice">
        El organizador no aceptó tu solicitud para esta partida. Puedes explorar
        otros planes.
      </div>
    );
  if (!upcoming)
    return own ? null : (
      <div className="notice">Esta partida ya comenzó o está cerrada.</div>
    );
  if (!gameSeats(game).remaining || game.status === "full")
    return (
      <div className="notice">
        El grupo está completo. Si alguien sale, volverá a aparecer un lugar
        disponible.
      </div>
    );
  return (
    <div className="party-join-box">
      <strong>
        {direct ? "Hay un lugar para ti." : "¿Te sumas a la ronda?"}
      </strong>
      <p>
        {direct
          ? "Al unirte quedas confirmado y entras al chat del grupo, sin esperar aprobación."
          : "El organizador revisará tu solicitud antes de confirmar tu lugar."}
      </p>
      <label className="party-access-check">
        <input
          type="checkbox"
          checked={acknowledged}
          disabled={busy}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
        <span>
          Gestionaré mi acceso válido con el club. Unirme no reserva el tee time
          ni autoriza mi entrada.
        </span>
      </label>
      <Button
        disabled={busy || !acknowledged}
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          try {
            await data.run(
              () => supabase!.rpc("request_join", { g: game.id }),
              direct
                ? "¡Ya estás en la party! Tu lugar está confirmado."
                : "Solicitud enviada. El organizador debe aprobarla.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? "Procesando…"
          : direct
            ? "Unirme a la party"
            : "Solicitar unirme"}
        <ArrowRight size={17} />
      </Button>
    </div>
  );
}
