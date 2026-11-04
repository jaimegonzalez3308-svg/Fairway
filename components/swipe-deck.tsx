"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type PointerEvent,
} from "react";
import { ArrowLeft, ArrowRight, Heart } from "lucide-react";
import type { Profile } from "@/lib/domain";
import { swipeChoice, swipeThreshold, type SwipeChoice } from "@/lib/swipe";

type Actions = { onLike: () => void; onPass: () => void; busy: boolean };
type Gesture = {
  id: number;
  x: number;
  y: number;
  time: number;
  profileId: string;
  horizontal: boolean;
  width: number;
};
export function SwipeDeck({
  profiles,
  onDecide,
  renderCard,
  empty,
}: {
  profiles: Profile[];
  onDecide: (id: string, choice: SwipeChoice) => Promise<boolean>;
  renderCard: (profile: Profile, actions: Actions) => ReactNode;
  empty: ReactNode;
}) {
  const instructions = useId();
  const region = useRef<HTMLElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  const suppressClickUntil = useRef(0);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [outgoing, setOutgoing] = useState<{
    profile: Profile;
    choice: SwipeChoice;
  } | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const remaining = profiles.filter(
    (profile) => !dismissed.includes(profile.id),
  );
  const active = outgoing?.profile || remaining[0];
  const next = remaining.find((profile) => profile.id !== active?.id);

  async function commit(profile: Profile, choice: SwipeChoice) {
    if (locked.current) return;
    locked.current = true;
    gesture.current = null;
    setDragging(false);
    setError("");
    setOutgoing({ profile, choice });
    // Keep keyboard focus on the deck while its old controls leave the DOM.
    if (region.current?.contains(document.activeElement))
      region.current.focus({ preventScroll: true });
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const finishAnimation = new Promise((resolve) =>
      window.setTimeout(resolve, reduced ? 0 : 420),
    );
    try {
      const [saved] = await Promise.all([
        onDecide(profile.id, choice),
        finishAnimation,
      ]);
      if (!mounted.current) return;
      if (saved) {
        setDismissed((ids) => [...ids, profile.id]);
        setAnnouncement(
          `${choice === "like" ? "Like enviado a" : "Has pasado a"} ${profile.name}.`,
        );
      } else {
        setError(
          "No pudimos guardar tu decisión. El perfil sigue aquí; vuelve a intentarlo.",
        );
      }
    } catch {
      if (mounted.current)
        setError(
          "No pudimos conectar. El perfil sigue aquí; vuelve a intentarlo.",
        );
    } finally {
      locked.current = false;
      if (mounted.current) {
        setOutgoing(null);
        setDrag({ x: 0, y: 0 });
      }
    }
  }
  function resetGesture() {
    gesture.current = null;
    setDragging(false);
    setDrag({ x: 0, y: 0 });
  }
  function finishGesture(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x,
      dy = event.clientY - start.y;
    if (start.horizontal) {
      suppressClickUntil.current = Date.now() + 350;
      event.preventDefault();
    }
    const choice = start.horizontal
      ? swipeChoice(dx, dy, start.width, performance.now() - start.time)
      : null;
    const target = active;
    resetGesture();
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (choice && target?.id === start.profileId) void commit(target, choice);
  }
  const x = outgoing ? (outgoing.choice === "like" ? 1 : -1) * 720 : drag.x;
  const progress = outgoing
    ? 1
    : Math.min(1, Math.abs(drag.x) / swipeThreshold(gesture.current?.width ?? 440));
  const variables = {
    "--swipe-x": `${x}px`,
    "--swipe-y": `${outgoing ? 24 : drag.y * 0.12}px`,
    "--swipe-tilt": `${outgoing ? (outgoing.choice === "like" ? 22 : -22) : Math.max(-12, Math.min(12, drag.x / 18))}deg`,
    "--swipe-progress": progress,
  } as CSSProperties;
  return (
    <section
      className="swipe-discovery"
      ref={region}
      tabIndex={0}
      aria-label="Descubrir golfistas, tarjetas deslizables"
      aria-describedby={instructions}
      onKeyDown={(event) => {
        if (
          event.target !== event.currentTarget ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.repeat ||
          !active
        )
          return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          void commit(active, event.key === "ArrowRight" ? "like" : "pass");
        }
      }}
    >
      <div className="swipe-heading">
        <span>UN GOLFISTA A LA VEZ</span>
        <span>{remaining.length} por descubrir</span>
      </div>
      <p id={instructions} className="swipe-instructions">
        <ArrowLeft size={15} aria-hidden="true" /> Izquierda para pasar{" "}
        <span>·</span> Derecha para dar like{" "}
        <ArrowRight size={15} aria-hidden="true" />
        <span className="sr-only">
          También puedes usar los botones o las flechas del teclado al enfocar
          esta zona.
        </span>
      </p>
      {active ? (
        <div className="swipe-stage" style={variables}>
          {next && (
            <div className="swipe-under-card" aria-hidden="true">
              <img
                src={next.photo || "/images/avatar.svg"}
                alt=""
                draggable={false}
              />
              <span />
            </div>
          )}
          <div
            key={active.id}
            className={`swipe-card ${dragging ? "is-dragging" : ""} ${outgoing ? "is-leaving" : ""}`}
            inert={!!outgoing}
            onDragStart={(event) => event.preventDefault()}
            onClickCapture={(event) => {
              if (Date.now() < suppressClickUntil.current) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            onPointerDown={(event) => {
              if (
                locked.current ||
                !event.isPrimary ||
                event.button !== 0 ||
                (event.target as HTMLElement).closest(
                  "button:not(.photo-open), a, input, select, textarea",
                )
              )
                return;
              gesture.current = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                time: performance.now(),
                profileId: active.id,
                horizontal: false,
                width: event.currentTarget.getBoundingClientRect().width,
              };
            }}
            onPointerMove={(event) => {
              const start = gesture.current;
              if (!start || start.id !== event.pointerId || locked.current)
                return;
              const dx = event.clientX - start.x,
                dy = event.clientY - start.y;
              if (
                !start.horizontal &&
                Math.abs(dy) > 12 &&
                Math.abs(dy) > Math.abs(dx)
              ) {
                resetGesture();
                return;
              }
              if (
                !start.horizontal &&
                Math.abs(dx) > 8 &&
                Math.abs(dx) > Math.abs(dy) * 1.25
              ) {
                start.horizontal = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragging(true);
              }
              if (start.horizontal) {
                setDrag({ x: dx, y: dy });
                event.preventDefault();
              }
            }}
            onPointerUp={finishGesture}
            onPointerCancel={resetGesture}
            onLostPointerCapture={() => {
              if (gesture.current) resetGesture();
            }}
          >
            <div
              className="swipe-stamp swipe-stamp-like"
              aria-hidden="true"
              style={{
                opacity:
                  outgoing?.choice === "like" || (!outgoing && drag.x > 0)
                    ? progress
                    : 0,
              }}
            >
              <Heart size={20} /> ME INTERESA
            </div>
            <div
              className="swipe-stamp swipe-stamp-pass"
              aria-hidden="true"
              style={{
                opacity:
                  outgoing?.choice === "pass" || (!outgoing && drag.x < 0)
                    ? progress
                    : 0,
              }}
            >
              PASAR
            </div>
            {renderCard(active, {
              onLike: () => void commit(active, "like"),
              onPass: () => void commit(active, "pass"),
              busy: !!outgoing,
            })}
          </div>
        </div>
      ) : (
        empty
      )}
      {outgoing && (
        <p className="swipe-save-status" role="status">
          Guardando tu decisión…
        </p>
      )}
      {error && (
        <p className="swipe-error" role="alert">
          {error}
        </p>
      )}
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
        {active && !outgoing
          ? ` Ahora: ${active.name}. ${remaining.length} por descubrir.`
          : ""}
      </p>
    </section>
  );
}
