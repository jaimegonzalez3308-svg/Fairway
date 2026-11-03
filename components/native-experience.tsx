"use client";
import {
  Compass,
  Flag,
  Target,
  MessageCircle,
  UserRound,
  ArrowRight,
  MapPin,
  Plus,
  Users,
  Camera,
} from "lucide-react";
import { AccessibilityToggle } from "./accessibility-mode";
import { LegalLinks } from "./legal-links";

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
  { id: "scores", label: "Scores", icon: Target },
  { id: "mensajes", label: "Mensajes", icon: MessageCircle },
  { id: "perfil", label: "Mi perfil", icon: UserRound },
];

export function NativeTabBar({
  page,
  onNavigate,
  unreadMessages = 0,
  inert = false,
}: {
  page: string;
  onNavigate: (page: string) => void;
  unreadMessages?: number;
  inert?: boolean;
}) {
  return (
    <nav
      className="native-tab-bar"
      aria-label="Navegación de la app"
      inert={inert}
    >
      {nativeTabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-current={page === id ? "page" : undefined}
          onClick={() => onNavigate(id)}
        >
          <span className="native-tab-icon">
            <Icon size={22} strokeWidth={page === id ? 2.2 : 1.7} />
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
        <Plus size={19} />
        <span>Crear partida</span>
      </button>
      <button onClick={onScore}>
        <Target size={19} />
        <span>Anotar score</span>
      </button>
      <button onClick={onStory || onFriends}>
        {onStory ? (
          <Camera size={19} aria-hidden="true" />
        ) : (
          <Users size={19} aria-hidden="true" />
        )}
        <span>{onStory ? "Crear historia" : "Mis amigos"}</span>
      </button>
    </nav>
  );
}
