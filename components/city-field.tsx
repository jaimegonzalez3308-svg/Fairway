"use client";
import { useEffect, useId, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button, Field } from "./ui";
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
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const id = useId();
  const request = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [message, setMessage] = useState("");
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
          name="city"
          autoComplete="address-level2"
          list={`${id}-cities`}
          required
          minLength={2}
          maxLength={80}
          disabled={disabled}
          value={value}
          onChange={(event) => {
            const controller = request.current;
            request.current = null;
            controller?.abort();
            setBusy(false);
            setSuggestion("");
            setMessage("");
            onChange(event.target.value);
          }}
        />
        <datalist id={`${id}-cities`}>
          {suggestedCities.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </Field>
      <p className="city-location-note" id={`${id}-privacy`}>
        Opcional: para sugerir tu ciudad, enviaremos tu ubicación aproximada a
        BigDataCloud. Fairway solo guardará la ciudad que elijas al enviar el
        formulario.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || busy}
        aria-describedby={`${id}-privacy`}
        onClick={async () => {
          if (!navigator.geolocation || !window.isSecureContext) {
            setMessage(
              "Este navegador no permite obtener la ubicación. Escribe tu ciudad manualmente.",
            );
            return;
          }
          request.current?.abort();
          const controller = new AbortController();
          request.current = controller;
          const timeout = window.setTimeout(() => controller.abort(), 22000);
          setBusy(true);
          setSuggestion("");
          setMessage("");
          try {
            const city = await detectCity(
              navigator.geolocation,
              controller.signal,
            );
            if (!controller.signal.aborted) setSuggestion(city);
          } catch (error) {
            if (request.current === controller)
              setMessage(locationError(error));
          } finally {
            window.clearTimeout(timeout);
            if (request.current === controller) {
              setBusy(false);
              request.current = null;
            }
          }
        }}
      >
        <LocateFixed size={16} aria-hidden="true" />
        {busy ? "Buscando ciudad…" : "Usar mi ubicación"}
      </Button>
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
