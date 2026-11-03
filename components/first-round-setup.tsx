"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Flag, Users } from "lucide-react";
import { days, type Club, type Profile } from "@/lib/domain";
import { clubsForCity } from "@/lib/cities";
import {
  firstRoundPreferences,
  type FirstRoundPreferences,
} from "@/lib/first-round";
import { Button, Field } from "./ui";
import { CityField } from "./city-field";

export function FirstRoundSetup({
  profile,
  clubs,
  onSave,
  onDone,
  onSkip,
}: {
  profile: Profile;
  clubs: Club[];
  onSave: (preferences: FirstRoundPreferences) => Promise<void>;
  onDone: (destination: "descubrir" | "crear") => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<FirstRoundPreferences>({
    availability: profile.availability,
    holes: profile.holes,
    style: profile.style,
    city: profile.city,
    club_id: profile.club_id,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const mounted = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const titles = [
    "¿Cuándo te gusta jugar?",
    "¿Dónde sueles jugar?",
    "Tu próxima ronda empieza aquí",
  ];
  async function finish(destination: "descubrir" | "crear") {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await onSave(firstRoundPreferences(preferences));
      if (mounted.current) onDone(destination);
    } catch (e) {
      if (!mounted.current) return;
      setError(
        e instanceof Error
          ? e.message
          : "No pudimos guardar. Revisa tu conexión e intenta de nuevo.",
      );
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <div className="first-round-setup" aria-busy={busy}>
      <ol className="setup-progress" aria-label="Pasos para tu primera ronda">
        {["Cuándo", "Dónde", "A jugar"].map((label, i) => (
          <li key={label} aria-current={step === i ? "step" : undefined}>
            <span aria-hidden="true">
              {i < step ? <Check size={16} /> : i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <h3 ref={heading} tabIndex={-1}>
        {titles[step]}
      </h3>
      {step === 0 && (
        <>
          <p>
            Elige tus días habituales. Podrás cambiarlos después en tu perfil.
          </p>
          <fieldset disabled={busy} className="setup-days">
            <legend>Días disponibles</legend>
            {days.map((day) => (
              <label className="checkbox" key={day}>
                <input
                  type="checkbox"
                  checked={preferences.availability.includes(day)}
                  onChange={(e) =>
                    setPreferences((p) => ({
                      ...p,
                      availability: e.target.checked
                        ? [...p.availability, day]
                        : p.availability.filter((d) => d !== day),
                    }))
                  }
                />
                {day}
              </label>
            ))}
          </fieldset>
          <div className="form-grid">
            <Field label="Hoyos">
              <select
                value={preferences.holes}
                onChange={(e) =>
                  setPreferences((p) => ({
                    ...p,
                    holes: Number(e.target.value),
                  }))
                }
              >
                <option value={9}>9 hoyos</option>
                <option value={18}>18 hoyos</option>
              </select>
            </Field>
            <Field label="Estilo de juego">
              <select
                value={preferences.style}
                onChange={(e) =>
                  setPreferences((p) => ({ ...p, style: e.target.value }))
                }
              >
                <option value="social">Social</option>
                <option value="intermedio">Mejorar mi juego</option>
                <option value="competitivo">Competir</option>
              </select>
            </Field>
          </div>
        </>
      )}
      {step === 1 && (
        <>
          <CityField
            value={preferences.city}
            onChange={(city) =>
              setPreferences((p) => ({ ...p, city, club_id: null }))
            }
            disabled={busy}
            cities={clubs.map((c) => c.city)}
          />
          <Field
            label="Club habitual (opcional)"
            hint="Puedes continuar sin club. Elegir uno no acredita membresía ni reserva acceso."
          >
            <select
              value={preferences.club_id || ""}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  club_id: e.target.value || null,
                }))
              }
            >
              <option value="">Sin club habitual</option>
              {clubsForCity(
                clubs,
                preferences.city,
                preferences.club_id ? [preferences.club_id] : [],
              ).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}
      {step === 2 && (
        <>
          <p>
            {preferences.availability.join(", ")} · {preferences.holes} hoyos ·{" "}
            {preferences.city}
          </p>
          <p>
            Busca compañía con tus preferencias o publica un plan para que otros
            se apunten.
          </p>
          <div className="setup-destinations">
            <Button disabled={busy} onClick={() => void finish("descubrir")}>
              <Users size={18} />
              {busy ? "Guardando…" : "Guardar y buscar golfistas"}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void finish("crear")}
            >
              <Flag size={18} />
              Guardar y crear una partida
            </Button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <div className="button-row setup-navigation">
        {step > 0 && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              setError("");
              setStep(step - 1);
            }}
          >
            Atrás
          </Button>
        )}
        {step < 2 && (
          <Button
            onClick={() => {
              setError("");
              try {
                if (step === 0 && !preferences.availability.length)
                  throw new Error("Elige al menos un día para jugar.");
                if (step === 1) firstRoundPreferences(preferences);
                setStep(step + 1);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Continuar
            <ArrowRight size={16} />
          </Button>
        )}
        <Button variant="ghost" disabled={busy} onClick={onSkip}>
          Ahora no
        </Button>
      </div>
    </div>
  );
}
