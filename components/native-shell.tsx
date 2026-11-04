"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  CheckCheck,
  ChevronDown,
  Flag,
  MoreHorizontal,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { AccessibilityToggle } from "./accessibility-mode";
import { LegalLinks } from "./legal-links";
import { SidebarIcon } from "./sidebar-icon";
import { nativeHaptic } from "@/lib/native-device";
import { NATIVE_NETWORK_CHANGED, nativeOnline } from "@/lib/native-network";

const onboardingKey = "fairway.native-onboarding.v1";
const steps = [
  {
    icon: "descubrir",
    title: "Encuentra tu próxima ronda",
    text: "Descubre jugadores y clubes de tu ciudad. Filtra por horarios, nivel y el golf que te gusta.",
  },
  {
    icon: "partidas",
    title: "Un grupo, una partida",
    text: "Crea o únete a una partida y coordina el encuentro en su chat privado. Partidas y Mensajes están abajo.",
  },
  {
    icon: "scores",
    title: "Tu tarjeta va contigo",
    text: "Anota tus scores en el campo, guarda borradores sin conexión y compártelos cuando estés listo. Los avisos son opcionales.",
  },
];

function NativeEntryPhoto({ icon }: { icon: string }) {
  return (
    <div className="native-entry-photo" aria-hidden="true">
      <img
        src="/images/fairway-aerial-640.webp"
        alt=""
        width={640}
        height={320}
        fetchPriority="high"
      />
      <span className="native-entry-photo-mark">
        <SidebarIcon name={icon} />
      </span>
    </div>
  );
}

function NativeEntryLegal() {
  return (
    <details className="native-entry-legal">
      <summary>
        Privacidad y términos <ChevronDown size={15} aria-hidden="true" />
      </summary>
      <LegalLinks />
    </details>
  );
}
export function NativeEntry({
  onLogin,
  onSignup,
  onClubs,
}: {
  onLogin: () => void;
  onSignup: () => void;
  onClubs: () => void;
}) {
  const [step, setStep] = useState(0);
  const [returning, setReturning] = useState(() => {
    try {
      return (
        typeof localStorage !== "undefined" &&
        localStorage.getItem(onboardingKey) === "done"
      );
    } catch {
      return false;
    }
  });
  const heading = useRef<HTMLHeadingElement>(null);
  const complete = (next: () => void) => {
    try {
      localStorage.setItem(onboardingKey, "done");
    } catch {
      /* No account data here. */
    }
    setReturning(true);
    next();
  };
  const item = steps[step];
  if (returning)
    return (
      <main
        id="fw-main"
        tabIndex={-1}
        className="native-onboarding native-account-entry"
      >
        <header>
          <span className="native-wordmark">
            <Flag size={24} /> fairway<span>.</span>
          </span>
          <AccessibilityToggle compact />
        </header>
        <NativeEntryPhoto icon="partidas" />
        <section className="native-onboarding-content">
          <h1>
            Entra <em>a Fairway</em>
          </h1>
          <p>Abre tus partidas, scores y conversaciones.</p>
        </section>
        <div className="native-onboarding-actions">
          <button className="native-primary" onClick={onLogin}>
            Iniciar sesión <ArrowRight size={18} />
          </button>
          <button className="native-secondary" onClick={onSignup}>
            Crear mi cuenta
          </button>
          <button className="native-text-action" onClick={onClubs}>
            Explorar clubes sin cuenta
          </button>
        </div>
        <footer>
          <small>Para mayores de 18 años</small>
          <NativeEntryLegal />
        </footer>
      </main>
    );
  return (
    <main id="fw-main" tabIndex={-1} className="native-onboarding">
      <header>
        <span className="native-wordmark">
          <Flag size={24} /> fairway<span>.</span>
        </span>
        <AccessibilityToggle compact />
      </header>
      <div className="native-onboarding-content">
        <NativeEntryPhoto icon={item.icon} />
        <p className="native-kicker">{step + 1} DE 3 · TU GOLF, A MANO</p>
        <h1 ref={heading} tabIndex={-1}>
          {item.title}
        </h1>
        <p>{item.text}</p>
        <div className="native-step-dots" aria-label={`Paso ${step + 1} de 3`}>
          {steps.map((_, i) => (
            <span key={i} data-active={i === step} />
          ))}
        </div>
      </div>
      <div className="native-onboarding-actions">
        {step < 2 ? (
          <button
            className="native-primary"
            onClick={() => {
              setStep(step + 1);
              nativeHaptic();
              setTimeout(() => heading.current?.focus(), 0);
            }}
          >
            Continuar <ArrowRight size={18} />
          </button>
        ) : (
          <>
            <button
              className="native-primary"
              onClick={() => complete(onSignup)}
            >
              Crear mi cuenta <ArrowRight size={18} />
            </button>
            <button
              className="native-secondary"
              onClick={() => complete(onClubs)}
            >
              Explorar clubes
            </button>
          </>
        )}
        <button
          className="native-text-action"
          onClick={() => complete(onLogin)}
        >
          Ya tengo cuenta · Iniciar sesión
        </button>
        {step < 2 && (
          <button
            className="native-text-action"
            onClick={() => complete(onClubs)}
          >
            Omitir y explorar
          </button>
        )}
      </div>
      <footer>
        <small>Para mayores de 18 años</small>
        <NativeEntryLegal />
      </footer>
    </main>
  );
}

export function NativeRefresh({
  refresh,
  refreshing,
  pull,
}: {
  refresh: () => Promise<void>;
  refreshing: boolean;
  pull: number;
}) {
  // Pulling putts a ball toward the cup; refreshing drops it in.
  const progress = Math.min(1, pull / 76);
  return (
    <div
      className="native-refresh"
      data-pulling={pull > 0}
      data-refreshing={refreshing}
      data-ready={pull >= 76}
      style={{ "--pull": progress } as CSSProperties}
    >
      <span className="native-putt" aria-hidden="true">
        <svg viewBox="0 0 64 28" width="64" height="28">
          <ellipse
            className="native-putt-cup"
            cx="50"
            cy="22"
            rx="8"
            ry="2.6"
          />
          <path className="native-putt-pin" d="M50 21V5" />
          <path className="native-putt-flag" d="M50 5l9 3-9 3z" />
          <g className="native-putt-ball">
            <circle cx="9" cy="17" r="5" />
            <circle className="native-putt-dimple" cx="7.5" cy="15.5" r=".9" />
            <circle className="native-putt-dimple" cx="10.8" cy="18.2" r=".9" />
          </g>
        </svg>
      </span>
      <button
        type="button"
        onClick={() => void refresh()}
        disabled={refreshing || !nativeOnline()}
        aria-label="Actualizar esta pantalla"
      >
        <RefreshCw
          size={16}
          className={refreshing ? "native-spinning" : undefined}
        />
        {refreshing
          ? "Actualizando…"
          : pull >= 76
            ? "Suelta para actualizar"
            : pull > 0
              ? "Desliza para actualizar"
              : "Actualizar"}
      </button>
    </div>
  );
}

export function NativeConnectionState({
  cachedAt,
}: {
  cachedAt?: number | null;
}) {
  const [online, setOnline] = useState(nativeOnline);
  useEffect(() => {
    const change = () => setOnline(nativeOnline());
    window.addEventListener(NATIVE_NETWORK_CHANGED, change);
    window.addEventListener("online", change);
    window.addEventListener("offline", change);
    return () => {
      window.removeEventListener(NATIVE_NETWORK_CHANGED, change);
      window.removeEventListener("online", change);
      window.removeEventListener("offline", change);
    };
  }, []);
  if (online && !cachedAt) return null;
  return (
    <div className="native-connection" role="status">
      <WifiOff size={18} />
      <span>
        {!online ? "Estás sin conexión. " : "Mostrando una copia guardada. "}
        {cachedAt
          ? `Hay hasta 100 scores propios guardados el ${new Date(cachedAt).toLocaleString("es-MX")}. `
          : "Lo que todavía no se ha cargado necesita internet. "}
        Puedes guardar nuevas tarjetas como borradores privados; se sincronizan
        al reconectar.
      </span>
    </div>
  );
}

export function NativeSwipeRow({
  children,
  onRead,
}: {
  children: ReactNode;
  onRead: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const start = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="native-swipe-row"
      onTouchStart={(event) => {
        if (event.touches.length === 1)
          start.current = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
          };
      }}
      onTouchEnd={(event) => {
        const first = start.current;
        start.current = null;
        const touch = event.changedTouches[0];
        if (
          first &&
          touch &&
          Math.abs(touch.clientX - first.x) > 56 &&
          Math.abs(touch.clientY - first.y) < 24
        ) {
          event.preventDefault();
          setOpen(touch.clientX < first.x);
          nativeHaptic();
        }
      }}
    >
      <div className="native-swipe-content">
        {children}
        <button
          type="button"
          className="icon-btn"
          aria-label="Opciones de conversación"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
      {open && (
        <button
          type="button"
          className="native-read-action"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              if (await onRead()) setOpen(false);
            } catch {
              setError("No se pudo marcar como leída. Intenta de nuevo.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <CheckCheck size={18} />
          {busy ? "Guardando…" : "Marcar como leída"}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
