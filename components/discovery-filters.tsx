"use client";
import { Check, RotateCcw } from "lucide-react";
import { days, type Filters } from "@/lib/domain";
import { Button, Field } from "./ui";

export function FilterForm({
  filters: f,
  setFilters: set,
  clubs,
  onSave,
  onReset,
}: {
  filters: Filters;
  setFilters: (v: Filters) => void;
  clubs: { id: string; name: string }[];
  onSave: () => void;
  onReset: () => void;
}) {
  const update = (key: keyof Filters, value: string | number | boolean) =>
    set({ ...f, [key]: value });
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (f.minAge > f.maxAge || f.minHcp > f.maxHcp) return;
        onSave();
      }}
    >
      <Field label="Club de golf">
        <select value={f.club} onChange={(e) => update("club", e.target.value)}>
          <option value="any">Cualquier club</option>
          <option value="mine">Solo jugadores de mi club</option>
          <option value="none">Sin club</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="form-grid">
        <Field label="Handicap mínimo">
          <input
            type="number"
            min={-10}
            max={f.maxHcp}
            value={f.minHcp}
            onChange={(e) => update("minHcp", Number(e.target.value))}
          />
        </Field>
        <Field label="Handicap máximo">
          <input
            type="number"
            min={f.minHcp}
            max={54}
            value={f.maxHcp}
            onChange={(e) => update("maxHcp", Number(e.target.value))}
          />
        </Field>
        <Field label="Edad mínima">
          <input
            type="number"
            min={18}
            max={f.maxAge}
            value={f.minAge}
            onChange={(e) => update("minAge", Number(e.target.value))}
          />
        </Field>
        <Field label="Edad máxima">
          <input
            type="number"
            min={f.minAge}
            max={100}
            value={f.maxAge}
            onChange={(e) => update("maxAge", Number(e.target.value))}
          />
        </Field>
        <Field label="Disponibilidad">
          <select value={f.day} onChange={(e) => update("day", e.target.value)}>
            <option value="any">Cualquier día</option>
            {days.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Modalidad">
          <select
            value={f.holes}
            onChange={(e) => update("holes", e.target.value)}
          >
            <option value="any">9 o 18 hoyos</option>
            <option value="9">9 hoyos</option>
            <option value="18">18 hoyos</option>
          </select>
        </Field>
      </div>
      <Field label="Estilo de juego">
        <select
          value={f.style}
          onChange={(e) => update("style", e.target.value)}
        >
          <option value="any">Cualquier estilo</option>
          <option value="social">Social</option>
          <option value="intermedio">Intermedio</option>
          <option value="competitivo">Competitivo</option>
        </select>
      </Field>
      {[
        ["noHcp", "Incluir jugadores sin handicap"],
        ["verified", "Solo perfiles verificados"],
        ["guests", "Aceptan solicitudes de invitados"],
        ["beginner", "Acompañan a principiantes"],
        ["goodRating", "Calificación de 4 o más (con evaluaciones)"],
      ].map(([k, label]) => (
        <label className="checkbox" key={k}>
          <input
            type="checkbox"
            checked={Boolean(f[k as keyof Filters])}
            onChange={(e) => update(k as keyof Filters, e.target.checked)}
          />
          {label}
        </label>
      ))}
      <div className="button-row native-sheet-action">
        <Button type="button" variant="outline" onClick={onReset}>
          <RotateCcw size={15} />
          Restablecer
        </Button>
        <Button>
          Aplicar filtros
          <Check size={16} />
        </Button>
      </div>
    </form>
  );
}
