"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button, Field } from "./ui";
import { claimAutomaticLocation } from "@/lib/automatic-location";
import { isIOSApp, nativeBridge } from "@/lib/native-app";
import {
  cityOptions,
  detectCity,
  locationError,
  suggestedCities,
} from "@/lib/cities";

export function CityField({
  value,
  onChange,
  disabled = false,
  label = "Ciudad",
  automaticAccountId,
  cities = [],
  onLocatingChange,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  automaticAccountId?: string;
  cities?: string[];
  onLocatingChange?: (locating: boolean) => void;
}) {
  const id = useId();
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const manual = useRef(false);
  const change = useRef(onChange);
  change.current = onChange;
  const locatingChange = useRef(onLocatingChange);
  locatingChange.current = onLocatingChange;
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [message, setMessage] = useState("");
  const startRequest = useCallback(async (autofill: boolean) => {
    if (!navigator.geolocation || !window.isSecureContext) {
      setMessage(
        "Este navegador no permite obtener la ubicación. Elige o escribe tu ciudad manualmente.",
      );
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 22000);
    setBusy(true);
    locatingChange.current?.(true);
    setSuggestion("");
    setMessage("Buscando tu ciudad. También puedes elegirla manualmente.");
    try {
      const city = await detectCity(navigator.geolocation, controller.signal);
      if (controller.signal.aborted || request.current !== controller) return;
      if (autofill) {
        change.current(city);
        setMessage(
          `Ciudad detectada: ${city}. Puedes corregirla antes de guardar.`,
        );
      } else {
        setMessage("");
        setSuggestion(city);
      }
    } catch (error) {
      if (request.current === controller) {
        setMessage(locationError(error));
        if (autofill) input.current?.focus({ preventScroll: true });
      }
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) {
        setBusy(false);
        locatingChange.current?.(false);
        request.current = null;
      }
    }
  }, []);
  useEffect(() => {
    if (!automaticAccountId || disabled || isIOSApp(nativeBridge())) return;
    // Delay until the form is visible; Strict Mode cleanup cancels its first setup.
    const timer = window.setTimeout(() => {
      if (manual.current) return;
      let storage: Storage | undefined;
      try {
        storage = window.localStorage;
      } catch {
        /* Storage may be blocked. */
      }
      if (claimAutomaticLocation(automaticAccountId, storage))
        void startRequest(true);
      else
        setMessage(
          "Elige o confirma tu ciudad. Puedes usar el botón de ubicación si quieres intentarlo de nuevo.",
        );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [automaticAccountId, disabled, startRequest]);
  useEffect(
    () => () => {
      const controller = request.current;
      request.current = null;
      controller?.abort();
    },
    [],
  );
  return (
    <div className="city-field">
      <Field
        label={label}
        hint="Elige la ciudad donde sueles jugar. Podrás cambiarla en tu perfil."
      >
        <input
          ref={input}
          name="city"
          autoComplete="address-level2"
          list={`${id}-cities`}
          required
          minLength={2}
          maxLength={80}
          disabled={disabled}
          value={value}
          placeholder="Escribe o elige tu ciudad"
          onChange={(event) => {
            manual.current = true;
            const controller = request.current;
            request.current = null;
            controller?.abort();
            setBusy(false);
            locatingChange.current?.(false);
            setSuggestion("");
            setMessage("");
            onChange(event.target.value);
          }}
        />
        <datalist id={`${id}-cities`}>
          {cityOptions([...suggestedCities, ...cities]).map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </Field>
      <p className="city-location-note" id={`${id}-privacy`}>
        {automaticAccountId && !isIOSApp(nativeBridge()) &&
          "Al completar tu perfil solicitaremos permiso para rellenar tu ciudad. Puedes rechazarlo y elegirla manualmente. "}
        Opcional: para sugerir tu ciudad, enviaremos tu ubicación aproximada a
        BigDataCloud. Fairway solo guardará la ciudad que elijas al enviar el
        formulario.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || busy}
        aria-describedby={`${id}-privacy`}
        onClick={() => void startRequest(!!automaticAccountId)}
      >
        <LocateFixed size={16} aria-hidden="true" />
        {busy ? "Buscando ciudad…" : "Usar mi ubicación"}
      </Button>
      {busy && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            manual.current = true;
            const controller = request.current;
            request.current = null;
            controller?.abort();
            setBusy(false);
            locatingChange.current?.(false);
            setMessage("Elige o escribe tu ciudad para continuar.");
            input.current?.focus();
          }}
        >
          Elegir ciudad manualmente
        </Button>
      )}
      <div role="status" aria-live="polite" aria-atomic="true">
        {message && <p className="notice">{message}</p>}
        {suggestion && (
          <p className="city-suggestion">
            Ciudad sugerida: <strong>{suggestion}</strong>. Confirma si es donde
            sueles jugar.
          </p>
        )}
      </div>
      {suggestion && (
        <div className="button-row">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => {
              onChange(suggestion);
              setSuggestion("");
              setMessage(
                "Ciudad elegida. Se guardará al enviar el formulario.",
              );
            }}
          >
            Usar {suggestion}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSuggestion("")}
          >
            Descartar
          </Button>
        </div>
      )}
    </div>
  );
}

export function CityFilter({
  scope,
  ownCity,
  cities,
  onChange,
}: {
  scope: string;
  ownCity: string;
  cities: string[];
  onChange: (scope: string) => void;
}) {
  return (
    <Field
      label="Ciudad para explorar"
      hint="Este filtro no cambia la ciudad de tu perfil."
    >
      <select value={scope} onChange={(event) => onChange(event.target.value)}>
        <option value="mine">Mi ciudad · {ownCity}</option>
        <option value="any">Todas las ciudades</option>
        {cityOptions([
          ...cities,
          ...(scope !== "mine" && scope !== "any" ? [scope] : []),
        ]).map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
    </Field>
  );
}
