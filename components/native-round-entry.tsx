"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  Minus,
  Plus,
  Save,
} from "lucide-react";
import { summarize, type Hole } from "@/lib/domain";
import { holeEntryIssue } from "@/lib/round-entry";
import { Button, Field } from "./ui";

type Stage = "setup" | "holes" | "review";
type SaveStatus = "draft" | "finished" | "published";

export function NativeRoundEntry({
  scores,
  configured,
  editing,
  published = false,
  busy,
  setup,
  notes,
  onChange,
  onSave,
}: {
  scores: Hole[];
  configured: boolean;
  editing: boolean;
  published?: boolean;
  busy: boolean;
  setup: ReactNode;
  notes: ReactNode;
  onChange: (
    index: number,
    key: keyof Hole,
    value: number | boolean | null,
  ) => void;
  onSave: (form: HTMLFormElement, status: SaveStatus) => Promise<void>;
}) {
  const [stage, setStage] = useState<Stage>(editing ? "review" : "setup");
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      scores.findIndex((h) => h.strokes === null),
    ),
  );
  const [issue, setIssue] = useState("");
  const setupRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const issueRef = useRef<HTMLParagraphElement>(null);
  const previous = useRef({ stage, index });
  const activeIndex = Math.min(index, scores.length - 1);
  const hole = scores[activeIndex];
  const summary = summarize(scores);
  const completed = scores.filter((h) => h.strokes !== null).length;
  const remaining = scores.length - completed;

  useEffect(() => {
    if (stage === previous.current.stage && index === previous.current.index)
      return;
    previous.current = { stage, index };
    headingRef.current?.focus();
  }, [stage, index]);
  useEffect(() => {
    if (issue) issueRef.current?.focus();
  }, [issue]);

  function setupValid() {
    const controls = setupRef.current?.querySelectorAll<
      HTMLInputElement | HTMLSelectElement
    >("input, select");
    const invalid = Array.from(controls || []).find(
      (control) => !control.checkValidity(),
    );
    if (!invalid) return true;
    setStage("setup");
    setIssue("Revisa los datos de tu ronda antes de continuar.");
    window.setTimeout(() => {
      invalid.focus();
      invalid.reportValidity();
    }, 0);
    return false;
  }
  function go(next: Stage, nextIndex = activeIndex) {
    setIssue("");
    setIndex(nextIndex);
    setStage(next);
  }
  function next(pending = false) {
    const error = holeEntryIssue(hole, !pending);
    if (error) {
      setIssue(error);
      return;
    }
    go(
      activeIndex === scores.length - 1 ? "review" : "holes",
      activeIndex + (activeIndex < scores.length - 1 ? 1 : 0),
    );
  }
  async function save(form: HTMLFormElement, status: SaveStatus) {
    if (!setupValid()) return;
    const invalid = scores.findIndex((h) =>
      holeEntryIssue(h, status !== "draft"),
    );
    if (invalid !== -1) {
      go("holes", invalid);
      setIssue(holeEntryIssue(scores[invalid], status !== "draft")!);
      return;
    }
    await onSave(form, status);
  }
  function change(key: keyof Hole, value: number | boolean | null) {
    setIssue("");
    onChange(activeIndex, key, value);
  }

  return (
    <fieldset className="native-round-entry" disabled={busy}>
      <legend className="sr-only">Registro de ronda, un hoyo a la vez</legend>
      <nav className="native-round-steps" aria-label="Pasos de la ronda">
        {(
          [
            ["setup", "Datos"],
            ["holes", "Hoyos"],
            ["review", "Revisión"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-current={stage === value ? "step" : undefined}
            onClick={() => {
              if (value === "setup" || setupValid()) go(value);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {issue && (
        <p
          ref={issueRef}
          tabIndex={-1}
          role="alert"
          className="native-round-error"
        >
          {issue}
        </p>
      )}

      <div
        ref={setupRef}
        hidden={stage !== "setup"}
        className="native-round-setup"
      >
        {stage === "setup" && (
          <h3 ref={headingRef} tabIndex={-1}>
            Prepara tu ronda
          </h3>
        )}
        <p>Elige tu campo y tu salida. Después, vamos hoyo por hoyo.</p>
        {setup}
        <div className="native-round-footer">
          <Button
            type="button"
            onClick={() => {
              setIssue("");
              if (setupValid()) go("holes");
            }}
          >
            {editing ? "Continuar ronda" : "Empezar ronda"}{" "}
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

      {stage === "holes" && (
        <>
          <div className="native-round-progress">
            <span>
              {completed} de {scores.length} anotados
            </span>
            <button
              type="button"
              onClick={(e) => void save(e.currentTarget.form!, "draft")}
            >
              <Save size={16} /> Borrador
            </button>
            <progress
              value={completed}
              max={scores.length}
              aria-label="Hoyos anotados"
            />
          </div>
          <section
            className="native-hole-entry"
            aria-labelledby="native-hole-title"
          >
            <header>
              <div>
                <h3 id="native-hole-title" ref={headingRef} tabIndex={-1}>
                  Hoyo <em>{hole.hole}</em>
                </h3>
                <p>
                  {hole.hole <= 9 ? "Ida" : "Vuelta"} · {hole.hole} de{" "}
                  {scores.length}
                </p>
              </div>
              <Flag size={28} aria-hidden="true" />
            </header>
            <div className="native-hole-par">
              <Field label="Par del hoyo">
                {configured ? (
                  <input value={hole.par ?? ""} readOnly />
                ) : (
                  <select
                    value={hole.par ?? ""}
                    onChange={(e) =>
                      change(
                        "par",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  >
                    <option value="">Sin dato</option>
                    {[3, 4, 5, 6].map((par) => (
                      <option key={par} value={par}>
                        Par {par}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <span>
                {hole.distance != null
                  ? `${hole.distance} m`
                  : "Par opcional en captura manual"}
              </span>
            </div>
            <div className="native-hole-score">
              <label htmlFor="native-hole-strokes">Tus golpes</label>
              <div className="native-hole-stepper">
                <button
                  type="button"
                  aria-label="Restar un golpe"
                  disabled={hole.strokes === null || hole.strokes <= 1}
                  onClick={() =>
                    change("strokes", Math.max(1, (hole.strokes ?? 1) - 1))
                  }
                >
                  <Minus size={24} />
                </button>
                <input
                  id="native-hole-strokes"
                  aria-label={`Golpes, hoyo ${hole.hole}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={30}
                  step={1}
                  placeholder="—"
                  value={hole.strokes ?? ""}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    change(
                      "strokes",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
                <button
                  type="button"
                  aria-label="Sumar un golpe"
                  disabled={hole.strokes !== null && hole.strokes >= 30}
                  onClick={() =>
                    change("strokes", Math.min(30, (hole.strokes ?? 0) + 1))
                  }
                >
                  <Plus size={24} />
                </button>
              </div>
              <div
                className="native-hole-quick"
                role="group"
                aria-label="Anotar golpes rápidamente"
              >
                {(hole.par === null
                  ? [3, 4, 5, 6]
                  : [hole.par - 1, hole.par, hole.par + 1, hole.par + 2]
                ).map((strokes) => (
                  <button
                    key={strokes}
                    type="button"
                    aria-label={`Anotar ${strokes} golpes`}
                    aria-pressed={hole.strokes === strokes}
                    onClick={() => change("strokes", strokes)}
                  >
                    {strokes}
                  </button>
                ))}
              </div>
              <p className="native-hole-result" aria-live="polite">
                {hole.strokes === null
                  ? "Toca un número o usa − / +"
                  : hole.par === null
                    ? `${hole.strokes} golpes anotados`
                    : hole.strokes === hole.par
                      ? "Par. Bien jugado."
                      : `${hole.strokes - hole.par > 0 ? "+" : ""}${hole.strokes - hole.par} contra par`}
              </p>
            </div>
            <details className="native-hole-details" key={hole.hole}>
              <summary>
                Más detalles <span>Opcional</span>
                <ChevronRight size={16} />
              </summary>
              <div className="form-grid">
                <Field label="Putts">
                  <input
                    aria-label={`Putts, hoyo ${hole.hole}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={30}
                    value={hole.putts ?? ""}
                    placeholder="Sin dato"
                    onChange={(e) =>
                      change(
                        "putts",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                </Field>
                {(
                  [
                    ["fairway", "Fairway"],
                    ["gir", "Green en regulación"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <select
                      value={hole[key] == null ? "" : String(hole[key])}
                      onChange={(e) =>
                        change(
                          key,
                          e.target.value === ""
                            ? null
                            : e.target.value === "true",
                        )
                      }
                    >
                      <option value="">Sin dato</option>
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                    </select>
                  </Field>
                ))}
                {(
                  [
                    ["distance", "Distancia (m)", 900],
                    ["index", "Índice", 18],
                  ] as const
                ).map(([key, label, max]) => (
                  <Field key={key} label={label}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={max}
                      readOnly={configured}
                      value={hole[key] ?? ""}
                      placeholder="Sin dato"
                      onChange={(e) =>
                        change(
                          key,
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </Field>
                ))}
              </div>
            </details>
          </section>
          <details className="native-hole-jump">
            <summary>
              Ir a otro hoyo <ChevronRight size={16} />
            </summary>
            <div>
              {scores.map((h, i) => (
                <button
                  key={h.hole}
                  type="button"
                  aria-label={`Ir al hoyo ${h.hole}${h.strokes === null ? ", pendiente" : ", anotado"}`}
                  aria-current={i === activeIndex ? "step" : undefined}
                  onClick={() => go("holes", i)}
                >
                  {h.hole}
                  {h.strokes !== null && <Check size={12} aria-hidden="true" />}
                </button>
              ))}
            </div>
          </details>
          <div className="native-round-footer native-hole-navigation">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                go(
                  activeIndex === 0 ? "setup" : "holes",
                  Math.max(0, activeIndex - 1),
                )
              }
            >
              <ChevronLeft size={17} />{" "}
              {activeIndex === 0 ? "Datos" : "Anterior"}
            </Button>
            <Button type="button" onClick={() => next()}>
              {activeIndex === scores.length - 1
                ? "Revisar ronda"
                : "Siguiente"}
              <ChevronRight size={17} />
            </Button>
            {hole.strokes === null && (
              <button
                className="native-hole-skip"
                type="button"
                onClick={() => next(true)}
              >
                Dejar este hoyo pendiente
              </button>
            )}
          </div>
        </>
      )}

      <div hidden={stage !== "review"} className="native-round-review">
        {stage === "review" && (
          <h3 ref={headingRef} tabIndex={-1}>
            Tu ronda, de un vistazo
          </h3>
        )}
        <div className="native-round-totals">
          <div>
            <strong>{completed ? summary.total : "—"}</strong>
            <span>
              golpes · {completed}/{scores.length} hoyos
            </span>
          </div>
          <div>
            <strong>
              {!completed || summary.relative === null
                ? "—"
                : summary.relative === 0
                  ? "E"
                  : `${summary.relative > 0 ? "+" : ""}${summary.relative}`}
            </strong>
            <span>contra par</span>
          </div>
        </div>
        <p>Toca un hoyo para revisar o corregir su resultado.</p>
        {([0, 9] as const)
          .filter((start) => start < scores.length)
          .map((start) => (
            <section key={start} className="native-round-nine">
              <h4>
                {start === 0 ? "Ida" : "Vuelta"}
                <span>
                  {scores
                    .slice(start, start + 9)
                    .some((h) => h.strokes !== null)
                    ? `${scores.slice(start, start + 9).reduce((sum, h) => sum + (h.strokes ?? 0), 0)} golpes`
                    : "Sin anotar"}
                </span>
              </h4>
              <div className="native-round-review-grid">
                {scores.slice(start, start + 9).map((h, i) => (
                  <button
                    type="button"
                    key={h.hole}
                    aria-label={`Editar hoyo ${h.hole}, ${h.strokes === null ? "pendiente" : `${h.strokes} golpes`}`}
                    onClick={() => go("holes", start + i)}
                  >
                    <span>Hoyo {h.hole}</span>
                    <strong>{h.strokes ?? "—"}</strong>
                    <small>
                      {h.strokes === null
                        ? "Pendiente"
                        : h.par === null
                          ? "Sin par"
                          : `Par ${h.par}`}
                    </small>
                  </button>
                ))}
              </div>
            </section>
          ))}
        {notes}
        {remaining > 0 && (
          <p className="native-round-pending">
            {remaining}{" "}
            {remaining === 1 ? "hoyo pendiente" : "hoyos pendientes"}. Puedes
            guardar un borrador y seguir después.
          </p>
        )}
        <div className="native-round-footer native-round-save">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => void save(e.currentTarget.form!, "draft")}
          >
            <Save size={17} /> Borrador
          </Button>
          {remaining ? (
            <Button
              type="button"
              onClick={() =>
                go(
                  "holes",
                  scores.findIndex((h) => h.strokes === null),
                )
              }
            >
              Completar hoyos
            </Button>
          ) : (
            <Button
              type="button"
              onClick={(e) =>
                void save(
                  e.currentTarget.form!,
                  published ? "published" : "finished",
                )
              }
            >
              <Check size={17} />{" "}
              {published ? "Guardar cambios" : "Guardar ronda"}
            </Button>
          )}
        </div>
        {!remaining && !published && (
          <details className="native-round-share">
            <summary>Compartir la tarjeta</summary>
            <p>Publica el score con la privacidad que elegiste en Datos.</p>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => void save(e.currentTarget.form!, "published")}
            >
              Publicar score
            </Button>
          </details>
        )}
      </div>
      {busy && <p role="status">Guardando tu ronda…</p>}
    </fieldset>
  );
}
