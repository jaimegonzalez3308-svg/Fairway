"use client";
import {
  Compass,
  Flag,
  MessageCircle,
  UserRound,
  ArrowRight,
  MapPin,
  Plus,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { nativeTourSteps } from "@/lib/native-tour";
import { AccessibilityToggle } from "./accessibility-mode";
import { LegalLinks } from "./legal-links";
import { SidebarIcon } from "./sidebar-icon";
import { StoryCreateIcon } from "./story-create-icon";

export function NativeWelcome({
  onLogin,
  onSignup,
  onClubs,
}: {
  onLogin: () => void;
  onSignup: () => void;
  onClubs: () => void;
}) {
  return (
    <main id="fw-main" tabIndex={-1} className="native-welcome">
      <header className="native-welcome-header">
        <span className="native-wordmark">
          <Flag size={24} strokeWidth={1.6} />
          fairway<span>.</span>
        </span>
        <AccessibilityToggle compact />
      </header>
      <div className="native-welcome-art" aria-hidden="true">
        <img
          src="/images/fairway-aerial-640.webp"
          alt=""
          width={640}
          height={440}
          fetchPriority="high"
        />
        <span className="native-course-tag">
          <Flag size={14} />
          NOS VEMOS EN EL GREEN
        </span>
        <span className="native-hole-marker">
          18
          <span>
            HOYOS.
            <br />
            BUENA COMPAÑÍA.
          </span>
        </span>
      </div>
      <section
        className="native-welcome-copy"
        aria-labelledby="native-welcome-title"
      >
        <p className="native-kicker">TU PRÓXIMA RONDA EMPIEZA AQUÍ</p>
        <h1 id="native-welcome-title">
          Buen golf.
          <br />
          <em>Mejor compañía.</em>
        </h1>
        <p>
          Encuentra con quién jugar, arma tu partida y lleva tus scores contigo.
        </p>
      </section>
      <div className="native-welcome-actions">
        <button className="native-primary" onClick={onLogin}>
          Iniciar sesión <ArrowRight size={19} />
        </button>
        <button className="native-secondary" onClick={onSignup}>
          Crear mi cuenta
        </button>
        <button className="native-text-action" onClick={onClubs}>
          <MapPin size={16} />
          Explorar clubes sin cuenta
        </button>
      </div>
      <footer className="native-welcome-footer">
        <span>Comunidad para mayores de 18 años</span>
        <LegalLinks />
      </footer>
    </main>
  );
}

export const nativeTabs = [
  { id: "descubrir", label: "Descubrir", icon: Compass },
  { id: "partidas", label: "Partidas", icon: Flag },
  { id: "create-story", label: "Crear", icon: Plus },
  { id: "mensajes", label: "Mensajes", icon: MessageCircle },
  { id: "perfil", label: "Mi perfil", icon: UserRound },
];

export function NativeTabBar({
  page,
  onNavigate,
  onCreateStory,
  unreadMessages = 0,
  inert = false,
  highlight,
}: {
  page: string;
  onNavigate: (page: string) => void;
  onCreateStory: () => void;
  unreadMessages?: number;
  inert?: boolean;
  /** Tab pointed at by the first-run tour. */
  highlight?: string;
}) {
  return (
    <nav
      className="native-tab-bar"
      aria-label="Navegación de la app"
      inert={inert}
    >
      {nativeTabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={id === "create-story" ? "native-story-action" : undefined}
          aria-label={id === "create-story" ? "Crear historia" : undefined}
          aria-haspopup={id === "create-story" ? "dialog" : undefined}
          aria-current={
            id !== "create-story" && page === id ? "page" : undefined
          }
          data-tour={highlight === id ? "active" : undefined}
          onClick={() =>
            id === "create-story" ? onCreateStory() : onNavigate(id)
          }
        >
          <span className="native-tab-icon">
            {id === "create-story" ? (
              <StoryCreateIcon />
            ) : (
              <SidebarIcon name={id} />
            )}
            {id === "mensajes" && unreadMessages > 0 && (
              <span
                className="native-tab-badge"
                aria-label={`${unreadMessages} mensajes sin leer`}
              >
                {unreadMessages > 99 ? "99+" : unreadMessages}
              </span>
            )}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function NativeQuickActions({ onCreate }: { onCreate: () => void }) {
  return (
    <nav className="native-quick-actions" aria-label="Acciones rápidas">
      <button onClick={onCreate}>
        <span className="native-action-icon">
          <SidebarIcon name="partidas" />
        </span>
        <span>Crear partida</span>
      </button>
    </nav>
  );
}

/** A short first-run tour shown once after signing in. It sits above the
 * tab bar and points at each tab; it never blocks the screen behind it. */
export function NativeTour({
  steps = nativeTourSteps,
  website = false,
  step,
  onNext,
  onSkip,
}: {
  steps?: typeof nativeTourSteps;
  website?: boolean;
  step: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const item = steps[step];
  const last = step === steps.length - 1;
  const heading = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(step);
  useEffect(() => {
    // Focus follows the golfer's own "Siguiente", never the first appearance.
    if (step !== firstStep.current)
      heading.current?.focus({ preventScroll: true });
  }, [step]);
  if (!item) return null;
  return (
    <section
      className={website ? "native-tour website-tour" : "native-tour"}
      aria-labelledby="native-tour-title"
      aria-live="polite"
    >
      <p className="native-tour-count">
        {step + 1} de {steps.length}
      </p>
      <h2 id="native-tour-title" ref={heading} tabIndex={-1}>
        {item.title}
      </h2>
      <p id="native-tour-text">{item.text}</p>
      <div className="native-tour-actions">
        <button type="button" className="native-tour-skip" onClick={onSkip}>
          Saltar
        </button>
        <div className="native-tour-dots" aria-hidden="true">
          {steps.map((s, i) => (
            <span key={s.tab} data-active={i === step} />
          ))}
        </div>
        <button type="button" className="native-tour-next" onClick={onNext}>
          {last ? "Empezar" : "Siguiente"}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
