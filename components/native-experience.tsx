"use client";
import {
  Compass,
  Flag,
  MessageCircle,
  UserRound,
  ArrowRight,
  MapPin,
  Users,
  Camera,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { nativeTourSteps } from "@/lib/native-tour";
import { AccessibilityToggle } from "./accessibility-mode";
import { LegalLinks } from "./legal-links";
import { SidebarIcon } from "./sidebar-icon";

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
  { id: "amigos", label: "Amigos", icon: Users },
  { id: "mensajes", label: "Mensajes", icon: MessageCircle },
  { id: "perfil", label: "Mi perfil", icon: UserRound },
];

export function NativeTabBar({
  page,
  onNavigate,
  unreadMessages = 0,
  friendRequests = 0,
  inert = false,
  highlight,
}: {
  page: string;
  onNavigate: (page: string) => void;
  unreadMessages?: number;
  friendRequests?: number;
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
          aria-current={page === id ? "page" : undefined}
          data-tour={highlight === id ? "active" : undefined}
          onClick={() => onNavigate(id)}
        >
          <span className="native-tab-icon">
            <SidebarIcon name={id} />
            {id === "mensajes" && unreadMessages > 0 && (
              <span
                className="native-tab-badge"
                aria-label={`${unreadMessages} mensajes sin leer`}
              >
                {unreadMessages > 99 ? "99+" : unreadMessages}
              </span>
            )}
            {id === "amigos" && friendRequests > 0 && (
              <span
                className="native-tab-badge"
                aria-label={`${friendRequests} ${friendRequests === 1 ? "solicitud" : "solicitudes"} de amistad`}
              >
                {friendRequests > 99 ? "99+" : friendRequests}
              </span>
            )}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function NativeQuickActions({
  onCreate,
  onScore,
  onFriends,
  onStory,
}: {
  onCreate: () => void;
  onScore: () => void;
  onFriends: () => void;
  onStory?: () => void;
}) {
  return (
    <nav className="native-quick-actions" aria-label="Acciones rápidas">
      <button onClick={onCreate}>
        <span className="native-action-icon">
          <SidebarIcon name="partidas" />
        </span>
        <span>Crear partida</span>
      </button>
      <button onClick={onScore}>
        <span className="native-action-icon">
          <SidebarIcon name="scores" />
        </span>
        <span>Anotar score</span>
      </button>
      <button onClick={onStory || onFriends}>
        <span className="native-action-icon">
          {onStory ? (
            <Camera size={23} strokeWidth={1.6} aria-hidden="true" />
          ) : (
            <SidebarIcon name="amigos" />
          )}
        </span>
        <span>{onStory ? "Crear historia" : "Mis amigos"}</span>
      </button>
    </nav>
  );
}

/** A short first-run tour shown once after signing in. It sits above the
 * tab bar and points at each tab; it never blocks the screen behind it. */
export function NativeTour({
  step,
  onNext,
  onSkip,
}: {
  step: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const item = nativeTourSteps[step];
  const last = step === nativeTourSteps.length - 1;
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
      className="native-tour"
      aria-labelledby="native-tour-title"
      aria-live="polite"
    >
      <p className="native-tour-count">
        {step + 1} de {nativeTourSteps.length}
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
          {nativeTourSteps.map((s, i) => (
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
