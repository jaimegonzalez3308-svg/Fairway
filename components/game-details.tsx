"use client";
import { useRef, useState } from "react";
import { Check, Flag, Info, Repeat, Star, UserPlus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Game, Profile } from "@/lib/domain";
import type { FairwayData } from "@/lib/use-fairway";
import { canRatePlayer, reviewForPlayer, reviewValue } from "@/lib/ratings";
import { dateFormat, timeFormat } from "@/lib/utils";
import { gameIsUpcoming, gameSeats } from "@/lib/parties";
import { canRepeatGame, inviteCandidates } from "@/lib/party-repeat";
import { Button, Field, Modal } from "./ui";
import { statusLabel } from "./member-primitives";
import { GameJoinActions } from "./game-join-actions";
import { GameInvitations } from "./game-invitations";
import { GameShareLink } from "./share-link";

export function GameDetails({
  game: currentGame,
  clubName,
  data,
  onClose,
  onChat,
  onReview,
  friends = [],
  onRepeat,
}: {
  game: Game;
  clubName: string;
  data: FairwayData;
  onClose: () => void;
  onChat: (id: string) => void;
  onReview: (profile: Profile) => void;
  /** Accepted friends, listed first when inviting. */
  friends?: Profile[];
  /** Opens a new party prefilled from this one, one week later. */
  onRepeat?: (game: Game) => void;
}) {
  const inviteRef = useRef<HTMLSelectElement>(null);
  const invitePending = useRef(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [invitesSent, setInvitesSent] = useState(0);
  const allProfiles = [data.me, ...data.profiles, ...friends];
  const host = currentGame.host_id === data.user?.id;
  const missing =
    host && currentGame.status === "open" && gameIsUpcoming(currentGame)
      ? gameSeats(currentGame).remaining
      : 0;
  const candidates = inviteCandidates(
    currentGame,
    data.user?.id,
    friends,
    data.profiles,
  );
  const canInvite = candidates.friends.length + candidates.others.length > 0;
  return (
    <Modal title="Nos vemos en el tee" onClose={onClose}>
      <div className="game-detail-hero">
        <Flag size={24} />
        <h2>{clubName}</h2>
        <p>
          {dateFormat(currentGame.starts_at)} ·{" "}
          {timeFormat(currentGame.starts_at)} · {currentGame.holes} hoyos
        </p>
      </div>
      <div className="chips">
        <span className="badge">
          {currentGame.join_mode === "open"
            ? "Party abierta · unión directa"
            : "Con aprobación"}
        </span>
        <span className="badge">{currentGame.format}</span>
        <span className="badge">{currentGame.kind}</span>
        <span className="badge">{statusLabel(currentGame.status)}</span>
      </div>
      <p>{currentGame.description}</p>
      <div className="notice">
        <Info size={17} />
        {currentGame.access_conditions}
      </div>
      {missing > 0 && (
        <div className="notice party-open-spot" role="status">
          <UserPlus size={17} aria-hidden="true" />
          <div>
            <strong>
              {missing === 1
                ? "Falta 1 jugador."
                : `Faltan ${missing} jugadores.`}
            </strong>{" "}
            Invita a alguien de tu grupo o comparte el enlace de la partida.
          </div>
          {canInvite && (
            <Button
              variant="outline"
              onClick={() => {
                inviteRef.current?.scrollIntoView({ block: "center" });
                inviteRef.current?.focus();
              }}
            >
              Invitar a alguien
            </Button>
          )}
        </div>
      )}
      <GameJoinActions
        key={currentGame.id}
        game={currentGame}
        data={data}
        onChat={onChat}
      />
      <GameShareLink id={currentGame.id} />
      <h3>Jugadores confirmados</h3>
      {currentGame.participants
        ?.filter((p) => p.status === "confirmed")
        .map((p) => (
          <div className="list-row" key={p.user_id}>
            <span>
              {allProfiles.find((u) => u.id === p.user_id)?.name || "Golfista"}
            </span>
            <span className="badge">Confirmado</span>
          </div>
        ))}
      {currentGame.host_id === data.user?.id &&
      ["open", "full"].includes(currentGame.status) ? (
        <>
          {gameIsUpcoming(currentGame) && (
            <GameInvitations
              gameId={currentGame.id}
              userId={data.user!.id}
              participants={currentGame.participants}
              profiles={allProfiles}
              refresh={invitesSent}
            />
          )}
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              // The RPC notifies on every call, including duplicate invites.
              if (invitePending.current) return;
              const fd = new FormData(e.currentTarget);
              invitePending.current = true;
              setSendingInvite(true);
              try {
                const ok = await data.run(
                  () =>
                    supabase!.rpc("invite_to_game", {
                      g: currentGame.id,
                      invitee: fd.get("invitee"),
                    }),
                  "Invitación enviada. La persona debe aceptarla y confirmar acceso.",
                );
                if (ok) setInvitesSent((n) => n + 1);
              } finally {
                invitePending.current = false;
                setSendingInvite(false);
              }
            }}
          >
            {canInvite ? (
              <>
                <Field label="Invitar a un golfista">
                  <select
                    name="invitee"
                    required
                    ref={inviteRef}
                    disabled={sendingInvite}
                  >
                    {candidates.friends.length > 0 && (
                      <optgroup label="Tus amigos">
                        {candidates.friends.map((p) => (
                          <option value={p.id} key={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {candidates.others.length > 0 && (
                      <optgroup label="Otros golfistas">
                        {candidates.others.map((p) => (
                          <option value={p.id} key={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </Field>
                <Button variant="outline" disabled={sendingInvite}>
                  {sendingInvite ? "Enviando invitación…" : "Enviar invitación"}
                </Button>
              </>
            ) : (
              <p className="party-invite-empty">
                No hay más golfistas para invitar por ahora. Comparte el enlace
                de la partida.
              </p>
            )}
          </form>
          <h3>Solicitudes pendientes</h3>
          {currentGame.participants
            ?.filter((p) => p.status === "requested")
            .map((p) => (
              <div className="list-row" key={p.user_id}>
                <span>
                  {allProfiles.find((u) => u.id === p.user_id)?.name ||
                    "Golfista"}
                </span>
                <Button
                  variant="outline"
                  onClick={() =>
                    void data.run(
                      () =>
                        supabase!.rpc("manage_game", {
                          g: currentGame.id,
                          player: p.user_id,
                          action: "confirmed",
                        }),
                      "Jugador confirmado.",
                    )
                  }
                >
                  Aprobar
                </Button>
                <button
                  className="icon-btn"
                  aria-label="Rechazar solicitud"
                  onClick={() =>
                    void data.run(() =>
                      supabase!.rpc("manage_game", {
                        g: currentGame.id,
                        player: p.user_id,
                        action: "rejected",
                      }),
                    )
                  }
                >
                  <X size={17} />
                </button>
              </div>
            ))}
          <div className="button-row">
            <Button
              variant="outline"
              onClick={() =>
                void data.run(
                  () =>
                    supabase!.rpc("manage_game", {
                      g: currentGame.id,
                      player: data.user!.id,
                      action: "finished",
                    }),
                  "Partida finalizada. Ya pueden evaluarse.",
                )
              }
            >
              Finalizar partida
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                void data.run(
                  () =>
                    supabase!.rpc("manage_game", {
                      g: currentGame.id,
                      player: data.user!.id,
                      action: "cancelled",
                    }),
                  "Partida cancelada.",
                )
              }
            >
              Cancelar partida
            </Button>
          </div>
        </>
      ) : null}

      {onRepeat && canRepeatGame(currentGame, data.user?.id) && (
        <div className="party-repeat">
          <div>
            <strong>¿Otra vez la próxima semana?</strong>
            <p>
              Conserva el día de la semana y la hora en la próxima fecha futura.
              Revisa los datos e invita al mismo grupo si quieres.
            </p>
          </div>
          <Button variant="outline" onClick={() => onRepeat(currentGame)}>
            <Repeat size={16} aria-hidden="true" />
            Repetir la próxima semana
          </Button>
        </div>
      )}
      {currentGame.status === "finished" &&
        currentGame.participants?.some(
          (p) => p.user_id === data.user?.id && p.status === "confirmed",
        ) && (
          <>
            <h3>Califica a tus compañeros</h3>
            <p>
              De 1 a 5 estrellas. Una calificación por compañero en esta
              partida.
            </p>
            {currentGame.participants
              .filter(
                (p) => p.status === "confirmed" && p.user_id !== data.user?.id,
              )
              .map((p) => {
                const target = allProfiles.find((u) => u.id === p.user_id);
                const submitted = reviewForPlayer(
                  data.myReviews,
                  currentGame.id,
                  p.user_id,
                );
                return (
                  target && (
                    <div className="review-player-row" key={p.user_id}>
                      <span>{target.name}</span>
                      {submitted ? (
                        <span className="review-submitted" role="status">
                          <Check size={15} aria-hidden="true" /> Calificado:{" "}
                          {reviewValue(submitted)} de 5
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          disabled={
                            !canRatePlayer(
                              currentGame,
                              data.user?.id,
                              target.id,
                              data.myReviews,
                            )
                          }
                          aria-label={`Calificar a ${target.name}`}
                          onClick={() => {
                            onReview(target);
                          }}
                        >
                          <Star size={15} aria-hidden="true" />
                          Calificar
                        </Button>
                      )}
                    </div>
                  )
                );
              })}
          </>
        )}
    </Modal>
  );
}
