import type { ReactNode } from "react";

export type CoursePart =
  "tee" | "fairway" | "rough" | "bunker" | "green" | "hazards";
const marks: Record<CoursePart, ReactNode> = {
  tee: (
    <>
      <path d="M3 20h18M5 15V9h3v6m8 0V9h3v6M8 12h8" />
      <circle cx="12" cy="7" r="2" />
      <path d="M12 9v6" />
    </>
  ),
  fairway: (
    <>
      <path d="M5 21c-4-6 5-8 4-13s5-8 9-5c5 5-5 8-4 12s-5 8-9 6Z" />
      <path d="m5 16 10 1M7 12l8 1M9 8l9 1" />
    </>
  ),
  rough: (
    <>
      <path d="M3 20h18M4 20l-1-7 4 4-1-9 5 8 1-12 3 12 4-8-1 9 4-4-1 7" />
    </>
  ),
  bunker: (
    <>
      <path d="M3 15c-3-5 3-12 9-10s6 1 9 5-2 10-7 9S6 21 3 15Z" />
      <path d="m7 13 1 1m4-5 1 1m3 4 1 1m-7 2h1" />
    </>
  ),
  green: (
    <>
      <ellipse cx="12" cy="18" rx="9" ry="4" />
      <path d="M11 18V3l9 3-9 3" />
      <path d="M9 18h4" />
    </>
  ),
  hazards: (
    <>
      <path d="M3 13c3-3 6 3 9 0s6 3 9 0M3 18c3-3 6 3 9 0s6 3 9 0M6 10V3m12 7V3" />
      <path d="M4 3h4m8 0h4" />
    </>
  ),
};

export function CourseIcon({
  part,
  size = 22,
}: {
  part: CoursePart;
  size?: number;
}) {
  return (
    <svg
      className={`course-icon course-icon-${part}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {marks[part]}
    </svg>
  );
}
