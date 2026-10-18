"use client";

import { createContext, useContext, useEffect, useId, useState } from "react";
import { Accessibility } from "lucide-react";
import {
  ACCESSIBILITY_STORAGE_KEY,
  readAccessibilityMode,
  saveAccessibilityMode,
} from "@/lib/accessibility-mode";

const AccessibilityContext = createContext({
  enabled: false,
  ready: false,
  setEnabled: (_enabled: boolean) => {},
});

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [enabled, setState] = useState(false);
  const [ready, setReady] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const sync = () => {
      let next = false;
      try {
        next = readAccessibilityMode(window.localStorage);
      } catch {}
      document.documentElement.dataset.accessibility = String(next);
      setState(next);
      setReady(true);
    };
    sync();
    const changed = (event: StorageEvent) => {
      if (event.key === ACCESSIBILITY_STORAGE_KEY || event.key === null) sync();
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  function setEnabled(next: boolean) {
    document.documentElement.dataset.accessibility = String(next);
    setState(next);
    try {
      saveAccessibilityMode(window.localStorage, next);
    } catch {}
    setAnnouncement(
      next
        ? "Modo de accesibilidad activado."
        : "Modo de accesibilidad desactivado.",
    );
  }
  return (
    <AccessibilityContext.Provider value={{ enabled, ready, setEnabled }}>
      {children}
      <span
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </span>
    </AccessibilityContext.Provider>
  );
}

export function AccessibilitySetting() {
  const { enabled, ready, setEnabled } = useContext(AccessibilityContext);
  const hint = useId();
  return (
    <section aria-label="Accesibilidad">
      <h3>Accesibilidad</h3>
      <p id={hint}>
        Activa mayor contraste, texto más legible e indicadores de foco
        destacados. Se guarda en este navegador.
      </p>
      <label className="switch-row">
        <span>Modo de accesibilidad</span>
        <input
          type="checkbox"
          checked={enabled}
          disabled={!ready}
          aria-describedby={hint}
          onChange={(event) => setEnabled(event.target.checked)}
        />
      </label>
    </section>
  );
}

export function AccessibilityToggle({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { enabled, ready, setEnabled } = useContext(AccessibilityContext);
  return (
    <button
      type="button"
      className={`accessibility-choice ${className}`}
      aria-label="Modo de accesibilidad"
      title="Modo de accesibilidad"
      aria-pressed={enabled}
      disabled={!ready}
      onClick={() => setEnabled(!enabled)}
    >
      <Accessibility size={18} aria-hidden="true" />
      {!compact && (
        <span>{enabled ? "Accesibilidad activada" : "Accesibilidad"}</span>
      )}
    </button>
  );
}
