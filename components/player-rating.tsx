"use client";

import { useId } from "react";
import { Star } from "lucide-react";
import type { Profile } from "@/lib/domain";
import { ratingLabel } from "@/lib/ratings";
import { RatingBeer } from "./rating-beer";

export function StarRatingInput({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const help = useId();
  return (
    <fieldset
      className="star-rating-input"
      disabled={disabled}
      aria-describedby={help}
    >
      <legend>Tu calificación</legend>
      <div className="star-rating-options">
        {[1, 2, 3, 4, 5].map((score) => (
          <label
            key={score}
            className={`star-rating-choice${score <= value ? " is-filled" : ""}`}
          >
            <input
              type="radio"
              name="rating"
              value={score}
              required
              checked={value === score}
              aria-label={`${score} de 5 estrellas`}
              onChange={() => onChange(score)}
            />
            <Star
              size={28}
              fill={score <= value ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </label>
        ))}
      </div>
      <p id={help} className="star-rating-help" role="status">
        {value
          ? `${value} de 5 estrellas`
          : "Elige de 1 a 5 estrellas para continuar."}
      </p>
    </fieldset>
  );
}

export function PlayerRating({
  profile,
}: {
  profile: Pick<Profile, "rating" | "review_count">;
}) {
  const label = ratingLabel(profile);
  const rated =
    Number(profile.review_count) > 0 &&
    Number(profile.rating) >= 1 &&
    Number(profile.rating) <= 5;
  return (
    <div className="player-rating">
      <RatingBeer profile={profile} />
      {rated && (
        <span className="player-rating-stars" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((star) => (
            <span className="player-rating-star" key={star}>
              <Star size={20} />
              <span
                style={{
                  width: `${Math.max(0, Math.min(1, Number(profile.rating) - star)) * 100}%`,
                }}
              >
                <Star size={20} fill="currentColor" />
              </span>
            </span>
          ))}
        </span>
      )}
      <strong>{label}</strong>
    </div>
  );
}
