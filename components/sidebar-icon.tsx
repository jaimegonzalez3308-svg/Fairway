import type { ReactNode } from "react";

const ink = "var(--sidebar-icon-ink)";
const sage = "var(--sidebar-icon-sage)";
const gold = "var(--sidebar-icon-gold)";
const paper = "var(--sidebar-icon-paper)";

const drawings: Record<string, ReactNode> = {
  descubrir: (
    <>
      <circle cx="12" cy="12" r="8.5" fill={paper} />
      <circle cx="12" cy="12" r="6" stroke={sage} />
      <path d="m15.5 8.5-2 5-5 2 2-5Z" fill={sage} />
      <path d="m15.5 8.5-5 2 3 3Z" fill={gold} stroke="none" />
      <path d="M12 3.5V5m8.5 7H19M12 19v1.5M5 12H3.5" />
    </>
  ),
  partidas: (
    <>
      <ellipse cx="11.5" cy="19" rx="8.5" ry="2.5" fill={sage} stroke="none" />
      <ellipse cx="10" cy="19" rx="2.3" ry=".8" fill={ink} stroke="none" />
      <path d="M10 18.5V3.5" />
      <path d="M10 4c3-2 5 2 8 .5v7c-3 1.5-5-2.5-8-.5Z" fill={gold} />
      <circle cx="18" cy="17" r="1.5" fill={paper} />
    </>
  ),
  comunidad: (
    <>
      <path
        d="M2.5 18.5v-1a4 4 0 0 1 5.8-3.6m13.2 4.6v-1a4 4 0 0 0-5.8-3.6"
        fill={paper}
      />
      <circle cx="5.8" cy="9.5" r="2.5" fill={sage} />
      <circle cx="18.2" cy="9.5" r="2.5" fill={sage} />
      <path d="M6.5 20v-1.5a5.5 5.5 0 0 1 11 0V20Z" fill={sage} />
      <circle cx="12" cy="7.5" r="3.2" fill={paper} />
      <path d="M10.7 16.8h2.6" stroke={gold} strokeWidth="2" />
    </>
  ),
  amigos: (
    <>
      <path d="M2.5 20v-2a5 5 0 0 1 10 0v2Z" fill={sage} />
      <path d="M12.5 20v-1.5a4.5 4.5 0 0 1 9 0V20Z" fill={paper} />
      <circle cx="7.5" cy="7.5" r="3.2" fill={paper} />
      <circle cx="17" cy="9" r="2.7" fill={sage} />
      <path
        d="m17.8 2 .7 1.5 1.7.2-1.2 1.2.3 1.6-1.5-.8-1.5.8.3-1.6-1.2-1.2 1.7-.2Z"
        fill={gold}
        stroke="none"
      />
    </>
  ),
  mensajes: (
    <>
      <path
        d="M19 10.5h1a2 2 0 0 1 2 2V22l-4-3h-5a2 2 0 0 1-2-2v-1"
        fill={gold}
      />
      <path
        d="M5 3h11a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H8l-6 4V6a3 3 0 0 1 3-3Z"
        fill={sage}
      />
      <circle cx="6.5" cy="9.5" r=".8" fill={ink} stroke="none" />
      <circle cx="10.5" cy="9.5" r=".8" fill={ink} stroke="none" />
      <circle cx="14.5" cy="9.5" r=".8" fill={ink} stroke="none" />
    </>
  ),
  perfil: (
    <>
      <circle cx="11.5" cy="11.5" r="9" fill={paper} />
      <path d="M4.7 17.4a7.2 7.2 0 0 1 13.6 0" fill={sage} />
      <circle cx="11.5" cy="8.5" r="3.2" fill={sage} />
      <circle cx="19" cy="18.5" r="3" fill={gold} stroke={paper} />
    </>
  ),
  scores: (
    <>
      <rect x="3" y="3" width="15" height="18" rx="2" fill={paper} />
      <path d="M3 8h15V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" fill={sage} />
      <path d="M7 12h1m3 0h3m-7 4h1m3 0h2" />
      <path d="m15 20 .5-3.5L20 12l2 2-4.5 4.5Z" fill={gold} />
    </>
  ),
  estadisticas: (
    <>
      <rect x="5" y="13" width="3.5" height="7" rx=".8" fill={sage} />
      <rect x="11" y="9" width="3.5" height="11" rx=".8" fill={paper} />
      <rect x="17" y="4" width="3.5" height="16" rx=".8" fill={gold} />
      <path d="M2.5 4v17.5H22" />
    </>
  ),
  clubes: (
    <>
      <path d="M3 20c3-4 6-1 9-3s6-1 9 2" stroke={sage} strokeWidth="3" />
      <path
        d="M18.5 9c0 4.5-6.5 10-6.5 10S5.5 13.5 5.5 9a6.5 6.5 0 0 1 13 0Z"
        fill={sage}
      />
      <circle cx="12" cy="9" r="2.5" fill={paper} />
      <circle cx="20.5" cy="4" r="1.5" fill={gold} stroke="none" />
    </>
  ),
};

export function SidebarIcon({ name }: { name: string }) {
  return (
    <svg
      className="sidebar-icon"
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke={ink}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {drawings[name] ?? drawings.descubrir}
    </svg>
  );
}
