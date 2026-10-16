"use client";

import { useRef, type ReactNode } from "react";
import {
  ChevronRight,
  Eye,
  Heart,
  Clock3,
  Info,
  MoreHorizontal,
  Pause,
  Play,
  X,
  Trash2,
  Users,
} from "lucide-react";

export function StoryFrame({
  src,
  caption,
  authorName,
  avatar,
  time,
  audience,
  own,
  progress,
  paused,
  holding,
  busy,
  canPrevious,
  optionsOpen,
  onLoad,
  onError,
  onPause,
  onHold,
  onPrevious,
  onNext,
  onOptions,
  onClose,
  footer,
  children,
}: {
  src: string;
  caption: string;
  authorName: string;
  avatar?: string;
  time: string;
  audience: string;
  own: boolean;
  progress: number[];
  paused: boolean;
  holding: boolean;
  busy: boolean;
  canPrevious: boolean;
  optionsOpen: boolean;
  onLoad: () => void;
  onError: () => void;
  onPause: () => void;
  onHold: (holding: boolean) => void;
  onPrevious: () => void;
  onNext: () => void;
  onOptions: () => void;
  onClose: () => void;
  footer: ReactNode;
  children?: ReactNode;
}) {
  const pressStarted = useRef(0);
  return (
    <div className="story-stage">
      {src && (
        <>
          <img
            className="story-media-backdrop"
            src={src}
            alt=""
            aria-hidden="true"
          />
          <img
            className="story-media"
            src={src}
            alt={caption || `Momento de golf de ${authorName}`}
            onLoad={onLoad}
            onError={onError}
          />
        </>
      )}
      <div className="story-stage-shade" />
      <div className="story-viewer-top">
        <div className="story-progress" aria-hidden="true">
          {progress.map((value, index) => (
            <span key={index}>
              <i style={{ width: `${value}%` }} />
            </span>
          ))}
        </div>
        <div className="story-author">
          <span className="story-avatar">
            {avatar ? (
              <img src={avatar} alt="" />
            ) : (
              authorName.charAt(0).toUpperCase()
            )}
          </span>
          <div className="story-author-details">
            <div className="story-author-name">
              <strong>{own ? "Tu historia" : authorName}</strong>
              <span>{time}</span>
            </div>
            <small>
              <span className="story-audience-dot" />
              {audience}
            </small>
          </div>
          <div className="story-toolbar">
            <button
              className="story-control"
              aria-label={paused ? "Reanudar historia" : "Pausar historia"}
              aria-pressed={paused}
              onClick={onPause}
            >
              {paused ? (
                <Play size={18} fill="currentColor" />
              ) : (
                <Pause size={18} fill="currentColor" />
              )}
            </button>
            <button
              className="story-control"
              aria-label="Opciones de la historia"
              aria-expanded={optionsOpen}
              aria-controls="story-options"
              disabled={busy}
              onClick={onOptions}
            >
              <MoreHorizontal size={21} />
            </button>
            <button
              className="story-control story-close"
              aria-label="Cerrar historia"
              disabled={busy}
              onClick={onClose}
            >
              <X size={22} />
            </button>
          </div>
        </div>
      </div>
      <div className="story-tap-navigation">
        {(["previous", "next"] as const).map((direction) => (
          <button
            key={direction}
            aria-label={
              direction === "previous"
                ? "Historia anterior"
                : "Siguiente historia"
            }
            disabled={busy || (direction === "previous" && !canPrevious)}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              pressStarted.current = performance.now();
              event.currentTarget.setPointerCapture(event.pointerId);
              onHold(true);
            }}
            onPointerUp={() => onHold(false)}
            onPointerCancel={() => {
              pressStarted.current = 0;
              onHold(false);
            }}
            onLostPointerCapture={() => onHold(false)}
            onClick={(event) => {
              const held =
                event.detail > 0 &&
                pressStarted.current > 0 &&
                performance.now() - pressStarted.current >= 200;
              pressStarted.current = 0;
              if (!held) (direction === "previous" ? onPrevious : onNext)();
            }}
          />
        ))}
      </div>
      {(paused || holding) && (
        <div
          className={`story-pause-indicator ${holding && !paused ? "holding" : ""}`}
          aria-hidden="true"
        >
          <Pause size={16} />
          En pausa
        </div>
      )}
      <div className="story-viewer-bottom">
        {caption && <p className="story-caption">{caption}</p>}
        {footer}
      </div>
      {children}
    </div>
  );
}

export function StoryOptions({
  audience,
  own,
  busy,
  onClose,
  onDelete,
}: {
  audience: "members" | "friends";
  own: boolean;
  busy: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="story-options-sheet"
      id="story-options"
      role="region"
      aria-label="Opciones de la historia"
    >
      <div className="story-sheet-heading">
        <div>
          <span className="eyebrow">UN MOMENTO EN FAIRWAY</span>
          <h3>Sobre esta historia</h3>
        </div>
        <button
          className="icon-btn"
          aria-label="Cerrar opciones"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="story-option-detail">
        <Users size={19} />
        <div>
          <strong>
            {audience === "friends"
              ? "Compartida con amigos"
              : "Compartida con la comunidad"}
          </strong>
          <p>
            {audience === "friends"
              ? "Amistades aceptadas, según la privacidad del perfil del autor."
              : "Miembros con acceso al perfil del autor."}
          </p>
        </div>
      </div>
      <div className="story-option-detail">
        <Clock3 size={19} />
        <div>
          <strong>Un momento que dura 24 horas</strong>
          <p>Las historias desaparecen del visor cuando vencen.</p>
        </div>
      </div>
      <div className="story-option-detail">
        <Info size={19} />
        <div>
          <strong>Actividad privada</strong>
          <p>
            Solo quien publica puede consultar quién vio la historia y a quién
            le gustó.
          </p>
        </div>
      </div>
      {own && (
        <button
          className="story-option-delete"
          disabled={busy}
          onClick={onDelete}
        >
          <Trash2 size={18} />
          Eliminar historia
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

export function StoryEngagement({
  own,
  liked,
  views,
  likes,
  disabled,
  onLike,
  onActivity,
}: {
  own: boolean;
  liked: boolean;
  views: number;
  likes: number;
  disabled: boolean;
  onLike: () => void;
  onActivity: () => void;
}) {
  return (
    <div className="story-viewer-actions">
      {own ? (
        <button className="story-activity-button" onClick={onActivity}>
          <span className="story-activity-avatars">
            <Eye size={20} />
          </span>
          <span className="story-activity-copy">
            <strong>Actividad de tu historia</strong>
            <small>
              {views} {views === 1 ? "vista" : "vistas"} · {likes}{" "}
              {likes === 1 ? "like" : "likes"}
            </small>
          </span>
          <ChevronRight size={18} />
        </button>
      ) : (
        <>
          <button
            className={`story-reaction ${liked ? "liked" : ""}`}
            aria-label={
              liked ? "Quitar like a la historia" : "Dar like a la historia"
            }
            aria-pressed={liked}
            disabled={disabled}
            onClick={onLike}
          >
            <span>
              {liked
                ? "Te gustó este momento"
                : "Un buen momento merece un like"}
            </span>
            <span className="story-reaction-heart">
              <Heart size={24} fill={liked ? "currentColor" : "none"} />
            </span>
          </button>
          <small className="story-reaction-privacy">
            Solo quien publicó esta historia ve tu like.
          </small>
        </>
      )}
    </div>
  );
}
