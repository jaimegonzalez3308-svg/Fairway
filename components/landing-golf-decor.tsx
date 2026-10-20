import { useId } from "react";

/** Decorative course artwork; never intercepts a visitor's clicks or reading order. */
export function GolfBallTee() {
  const dimples = useId();
  return (
    <svg
      className="fw-golf-tee"
      viewBox="0 0 120 180"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id={dimples}
          width="12"
          height="11"
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx="6"
            cy="5"
            r="2.6"
            fill="none"
            stroke="#d3dccc"
            strokeWidth="1.1"
          />
        </pattern>
      </defs>
      <ellipse cx="62" cy="165" rx="39" ry="8" fill="#102c3b" opacity=".2" />
      <path
        d="M38 82Q60 101 82 82L70 109 60 160 51 109Z"
        fill="#174bcc"
        stroke="#f5f3ea"
        strokeWidth="2"
      />
      <path d="m60 109 1 36" stroke="#a9c8ff" strokeWidth="2" />
      <circle
        cx="60"
        cy="48"
        r="37"
        fill="#fffcf0"
        stroke="#dbe2d2"
        strokeWidth="1.5"
      />
      <circle cx="60" cy="48" r="35" fill={`url(#${dimples})`} />
      <path
        d="M30 54a31 31 0 0 0 51 17"
        fill="none"
        stroke="#d4decd"
        strokeWidth="4"
        opacity=".6"
      />
    </svg>
  );
}

export function CourseContours({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`fw-course-contours ${className}`}
      viewBox="0 0 300 280"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="currentColor" strokeWidth="1">
        <path d="M9 196C-32 119 65 145 62 66S178-23 225 29s-16 84 29 142-55 133-103 89S39 253 9 196Z" />
        <path d="M33 191C1 133 85 142 82 75S169 1 207 41s-14 81 27 130-43 105-82 71S57 235 33 191Z" />
        <path d="M57 185c-24-45 49-48 45-103s59-59 88-29-9 70 25 116-32 80-62 55-78-6-96-39Z" />
        <path d="M81 179c-15-35 43-40 40-89s36-43 51-23-6 64 24 100-22 55-43 39-62-3-72-27Z" />
      </g>
      <path
        d="M72 216c35-42 83-41 81-119"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 7"
      />
      <circle cx="72" cy="216" r="4" fill="currentColor" />
      <circle cx="153" cy="97" r="6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function PuttingFlag() {
  return (
    <svg
      className="fw-putting-flag"
      viewBox="0 0 240 260"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M18 218c-35-42 31-68 83-59s78-17 110 9 7 73-57 72-109 13-136-22Z"
        fill="#c4d7ff"
        fillOpacity=".13"
        stroke="#c4d7ff"
        strokeOpacity=".55"
      />
      <path
        d="M29 218c-18-28 30-46 74-37s68-18 94-5 0 47-46 48-98 12-122-6Z"
        stroke="#c4d7ff"
        strokeOpacity=".4"
      />
      <ellipse cx="113" cy="199" rx="14" ry="5" fill="#0c2d87" />
      <path d="M113 198V24" stroke="#fff9e9" strokeWidth="3" />
      <path d="m116 26 68 22-68 22Z" fill="#fff9e9" />
      <path
        d="M53 210c17-11 35-18 49-14"
        stroke="#fff9e9"
        strokeDasharray="3 6"
        strokeLinecap="round"
      />
      <circle cx="46" cy="213" r="6" fill="#fff9e9" />
    </svg>
  );
}
