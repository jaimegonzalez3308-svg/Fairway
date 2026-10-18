"use client";

import { useId } from "react";
import type { Profile } from "@/lib/domain";
import { ratingFillPercent } from "@/lib/ratings";

export function RatingBeer({
  profile,
  compact = false,
}: {
  profile: Pick<Profile, "rating" | "review_count">;
  compact?: boolean;
}) {
  const clip = useId();
  const percent = ratingFillPercent(profile);
  const height = (23 * percent) / 100;
  const top = 34 - height;
  const foam = Math.min(2.5, height * 0.2);
  return (
    <svg
      className={`rating-beer${compact ? " rating-beer-compact" : ""}`}
      width={compact ? 24 : 42}
      height={compact ? 24 : 42}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
      data-fill-percent={percent}
    >
      <defs>
        <clipPath id={clip}>
          <path d="M8 11h19v20a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3Z" />
        </clipPath>
      </defs>
      <path
        d="M29 13h3a5 5 0 0 1 5 5v5a5 5 0 0 1-5 5h-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="M6 9h23v23a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4Z"
        className="rating-beer-glass"
      />
      <g clipPath={`url(#${clip})`}>
        <rect
          className="rating-beer-liquid"
          x="8"
          y={top}
          width="19"
          height={height}
        />
        {percent > 0 && (
          <path
            className="rating-beer-foam"
            d={`M7 ${top}Q12 ${top - 1} 17 ${top}T28 ${top}V${top + foam}H7Z`}
          />
        )}
        {percent >= 40 && (
          <path
            d="M12 29v-3m5 5v-7m6 6v-3"
            stroke="#fffbf2"
            opacity=".55"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )}
      </g>
      <path
        d="M6 9h23v23a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M6 9h23"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
