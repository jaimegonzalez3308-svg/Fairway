"use client";

import { useId, useState } from "react";
import { CourseIcon, type CoursePart } from "./course-icon";

export const courseParts: { id: CoursePart; name: string; detail: string }[] = [
  {
    id: "tee",
    name: "Tee box",
    detail: "Zona de salida: desde aquí empieza el hoyo.",
  },
  {
    id: "fairway",
    name: "Fairway",
    detail: "La franja de pasto corto que lleva hacia el green.",
  },
  {
    id: "rough",
    name: "Rough",
    detail: "Pasto más alto que rodea al fairway.",
  },
  {
    id: "bunker",
    name: "Bunker",
    detail: "La zona de arena, dibujada en color dorado.",
  },
  {
    id: "green",
    name: "Green",
    detail: "La superficie de pasto corto donde están el hoyo y la bandera.",
  },
  {
    id: "hazards",
    name: "Hazards",
    detail: "Obstáculos del recorrido: aquí representados por agua y estacas.",
  },
];

export function CourseGuide({
  holes,
  routeKey,
}: {
  holes: 9 | 18;
  routeKey: string;
}) {
  const [selected, setSelected] = useState<CoursePart>("fairway");
  const id = useId();
  const region = (part: CoursePart) =>
    `course-region${selected === part ? " is-selected" : ""}`;
  const current = courseParts.find((part) => part.id === selected)!;
  const fairway =
    "M116 199c-20-20 6-48 38-57 43-12 67-28 82-65 15-40 73-33 81-3 9 34-23 54-52 68-39 18-48 38-87 53-23 9-45 21-62 4Z";
  return (
    <div className="course-guide">
      <div className="fw-course-art">
        <svg
          viewBox="0 0 460 250"
          fill="none"
          className="fw-course-svg"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <pattern
              id={`${id}-rough`}
              width="16"
              height="16"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="m3 13-1-5m1 5 3-3m6-6-1-3"
                stroke="#738e5a"
                strokeWidth="1"
                opacity=".38"
              />
            </pattern>
            <clipPath id={`${id}-fairway`}>
              <path d={fairway} />
            </clipPath>
          </defs>
          <path
            className={region("rough")}
            d="M82 220C34 183 83 116 128 108s62-49 96-70c43-26 119-9 128 42 8 45 40 64 3 98-34 31-73 18-116 41-44 24-117 31-157 1Z"
            fill="#bdcda4"
          />
          <path
            d="M82 220C34 183 83 116 128 108s62-49 96-70c43-26 119-9 128 42 8 45 40 64 3 98-34 31-73 18-116 41-44 24-117 31-157 1Z"
            fill={`url(#${id}-rough)`}
          />
          <path className={region("fairway")} d={fairway} fill="#84a56c" />
          <g
            clipPath={`url(#${id}-fairway)`}
            stroke="#a5bf85"
            strokeWidth="13"
            opacity=".65"
          >
            <path d="m95 175 240-100M95 204 350 99M118 223 240-52" />
          </g>
          <path
            className={region("hazards")}
            d="M68 112c-21-8-37 17-24 36 10 16 38 8 52 18 21 16 44-2 30-19-10-13-35-26-58-35Z"
            fill="#9ab9b5"
            stroke="#436d71"
          />
          <path
            d="M51 134q8-6 17 0t18 0m-12 15q7-5 14 0"
            stroke="#436d71"
            strokeLinecap="round"
          />
          <g stroke="#a8513e" strokeWidth="3">
            <path d="M96 126v-9m24 20v-9" />
          </g>
          <g className={region("bunker")} fill="#ead5a6" stroke="#ae8b4d">
            <path d="M325 91c-12-8-7-26 5-26 14 0 26 21 17 30-6 6-14 1-22-4Z" />
            <path d="M195 184c-16-6-34 1-32 11 3 12 25 9 33 1 5-5 5-9-1-12Z" />
          </g>
          <path d="M330 76l7 6M172 195l9-3" stroke="#ae8b4d" />
          <ellipse
            className={region("green")}
            cx="282"
            cy="76"
            rx="34"
            ry="24"
            fill="#cedfa8"
          />
          <path
            key={routeKey}
            className="fw-shot-path"
            d={
              holes === 9
                ? "M129 207Q154 128 282 76"
                : "M129 207Q248 176 282 76"
            }
            stroke="#fffbf2"
            strokeWidth="2"
            strokeDasharray="4 4"
            pathLength="100"
          />
          <rect
            className={region("tee")}
            x="110"
            y="200"
            width="37"
            height="22"
            rx="4"
            fill="#426640"
          />
          <path d="M115 206v10m27-10v10" stroke="#fffbf2" strokeWidth="4" />
          <circle cx="129" cy="207" r="3" fill="#fffbf2" />
          <path
            d="M282 76V40l23 7-23 7"
            stroke="#183c30"
            strokeWidth="2.5"
            fill="#183c30"
            strokeLinejoin="round"
          />
          <ellipse cx="282" cy="77" rx="4" ry="2" fill="#183c30" />
        </svg>
        <div className="fw-hole-number">
          {holes}
          <span>HOYOS</span>
        </div>
        <span className="fw-map-tag">RECORRIDO ILUSTRATIVO</span>
      </div>
      <fieldset className="course-guide-controls">
        <legend>Explora las partes del campo</legend>
        <div className="course-guide-options">
          {courseParts.map((part) => (
            <button
              key={part.id}
              type="button"
              aria-pressed={selected === part.id}
              aria-controls={`${id}-detail`}
              onClick={() => setSelected(part.id)}
            >
              <CourseIcon part={part.id} size={19} />
              {part.name}
            </button>
          ))}
        </div>
      </fieldset>
      <p
        id={`${id}-detail`}
        className="course-guide-detail"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <strong>{current.name}.</strong> {current.detail}
      </p>
    </div>
  );
}
