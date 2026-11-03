"use client";
import {
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Flag,
  Heart,
  MapPin,
  ShieldCheck,
  Star,
  Target,
  X,
} from "lucide-react";
import { compatibility, type Profile } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { ratingLabel } from "@/lib/ratings";
import { RatingBeer } from "./rating-beer";

export function ProfileCard({
  profile: p,
  me,
  club,
  favorite,
  onOpen,
  onLike,
  onPass,
  onFavorite,
  disabled = false,
}: {
  profile: Profile;
  me: Profile;
  club: string;
  favorite: boolean;
  onOpen: () => void;
  onLike: () => void;
  onPass: () => void;
  onFavorite: () => void;
  disabled?: boolean;
}) {
  const match = compatibility(me, p);
  return (
    <article className="golfer-card">
      <div className="golfer-photo">
        <button
          disabled={disabled}
          onClick={onOpen}
          aria-label={`Ver perfil de ${p.name}`}
          className="photo-open"
        >
          <img
            src={p.photo || "/images/avatar.svg"}
            alt={p.name}
            loading="lazy"
          />
        </button>
        <span className="match-pill">
          <span className="live-dot" />
          {match.score}% compatible
        </span>
        <button
          disabled={disabled}
          className={cn("save-profile", favorite && "saved")}
          aria-label={favorite ? "Quitar de favoritos" : "Guardar perfil"}
          aria-pressed={favorite}
          onClick={onFavorite}
        >
          <Bookmark size={17} fill={favorite ? "currentColor" : "none"} />
        </button>
        <div className="photo-gradient" />
        <div className="golfer-name">
          <button disabled={disabled} onClick={onOpen}>
            {p.name}
            <span>, {p.age}</span>
            {p.verified && (
              <>
                <ShieldCheck size={18} />
                <span className="sr-only">Perfil verificado</span>
              </>
            )}
          </button>
          <span>
            <MapPin size={12} />
            {p.city}
          </span>
        </div>
      </div>
      <div className="golfer-details">
        <div className="golfer-meta">
          <span className="handicap-chip">
            HCP <strong>{p.handicap ?? "S/H"}</strong>
          </span>
          <span className="rating" role="img" aria-label={ratingLabel(p)}>
            <RatingBeer profile={p} compact />
            <Star size={12} fill="currentColor" aria-hidden="true" />
            {p.review_count ? p.rating : "—"}
            <small>{p.review_count ? `(${p.review_count})` : ""}</small>
          </span>
        </div>
        <p className="golfer-club">
          <Flag size={13} />
          {club}
        </p>
        <p className="golfer-bio">{p.bio}</p>
        <div className="golfer-tags">
          <span>
            <CalendarDays size={12} />
            {p.availability.includes("Sábado") &&
            p.availability.includes("Domingo")
              ? "Fines de semana"
              : p.availability.slice(0, 2).join(" y ")}
          </span>
          <span>
            <Target size={12} />
            {p.holes} hoyos
          </span>
        </div>
        <div className="golfer-actions">
          <button
            disabled={disabled}
            className="pass-button"
            onClick={onPass}
            aria-label={`Pasar a ${p.name}`}
          >
            <X size={21} />
          </button>
          <button
            disabled={disabled}
            className="profile-info-button"
            onClick={onOpen}
          >
            Ver perfil
            <ArrowUpRight size={13} />
          </button>
          <button
            disabled={disabled}
            className="like-button"
            onClick={onLike}
            aria-label={`Dar like a ${p.name}`}
          >
            <Heart size={22} />
          </button>
        </div>
      </div>
    </article>
  );
}
