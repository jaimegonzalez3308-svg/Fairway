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
  // A generic Maß: a tall straight stein with a heavy base, a wide D handle
  // and a grid of dimples. The liquid fills 23 units, like before.
  const height = (23 * percent) / 100;
  const top = 33 - height;
  const foam = Math.min(3, height * 0.25);
  const body = "M7 7H26V33a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3Z";
  const dimples = [12, 19.5, 27].flatMap((y) =>
    [10.5, 17.5].map((x) => ({ x, y })),
  );
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
          <path d="M9 9H24V32a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2Z" />
        </clipPath>
      </defs>
      <path
        d="M26 11h4.5a4 4 0 0 1 4 4v11a4 4 0 0 1-4 4H26"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d={body} className="rating-beer-glass" />
      <g clipPath={`url(#${clip})`}>
        <rect
          className="rating-beer-liquid"
          x="9"
          y={top}
          width="15"
          height={height}
        />
        {percent > 0 && (
          <path
            className="rating-beer-foam"
            d={`M8 ${top + 1}q2-2.5 4-0.8q2-2.5 4-0.8q2-2.5 4-0.8q2-2.5 5-0.4V${top + foam}H8Z`}
          />
        )}
      </g>
      {dimples.map(({ x, y }) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="5"
          height="5.5"
          rx="1.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity=".35"
        />
      ))}
      <path
        d={body}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M8 33.6H25"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {percent >= 90 && (
        <path
          className="rating-beer-foam"
          d="M5.5 8.5q.5-4 4.5-3q1.5-3.5 5.5-1.8q2.5-2.6 5.5-.4q4-.6 4.5 3.2q1.6 1.4.5 2.5H6.5q-1.8-.3-1-0.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
