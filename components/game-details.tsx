"use client";
import { Check, Flag, Info, Star, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Game, Profile } from "@/lib/domain";
import type { FairwayData } from "@/lib/use-fairway";
import { canRatePlayer, reviewForPlayer, reviewValue } from "@/lib/ratings";
import { dateFormat, timeFormat } from "@/lib/utils";
import { Button, Field, Modal } from "./ui";
import { statusLabel } from "./member-primitives";
import { GameJoinActions } from "./game-join-actions";
import { GameShareLink } from "./share-link";

export function GameDetails({
  game: currentGame,
  clubName,
  data,
  onClose,
  onChat,
  onReview,
}: {
  game: Game;
  clubName: string;
  data: FairwayData;
  onClose: () => void;
  onChat: (id: string) => void;
  onReview: (profile: Profile) => void;
}) {
  const allProfiles = [data.me, ...data.profiles];
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
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await data.run(
                () =>
                  supabase!.rpc("invite_to_game", {
                    g: currentGame.id,
                    invitee: fd.get("invitee"),
                  }),
                "Invitación enviada. La persona debe aceptarla y confirmar acceso.",
              );
            }}
          >
            <Field label="Invitar a un golfista">
              <select name="invitee" required>
                {data.profiles.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Button variant="outline">Enviar invitación</Button>
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
