"use client";
import { useEffect, useState } from "react";
import { Save, Send, Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Field } from "./ui";
import { type Round, type Hole, summarize, holeColor } from "@/lib/domain";
import { supabase } from "@/lib/supabase";
import type { FairwayData } from "@/lib/use-fairway";
export function Scorecard({
  data,
  round,
  onDone,
}: {
  data: FairwayData;
  round?: Round;
  onDone: () => void;
}) {
  const [count, setCount] = useState(round?.holes || 18),
    [scores, setScores] = useState<Hole[]>(
      round?.scores ||
        Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          par: null,
          strokes: null,
          putts: null,
          fairway: null,
          gir: null,
        })),
    ),
    [nine, setNine] = useState(0),
    [busy, setBusy] = useState(false);
  const [clubId, setClubId] = useState(round?.club_id || ""),
    [teeId, setTeeId] = useState(round?.tee_id || ""),
    [courses, setCourses] = useState<
      { id: string; club_id: string; name: string }[]
    >([]),
    [tees, setTees] = useState<
      { id: string; course_id: string; name: string; verified: boolean }[]
    >([]),
    [teeName, setTeeName] = useState(round?.tee || ""),
    [courseName, setCourseName] = useState(round?.course || "");
  useEffect(() => {
    if (!supabase) return;
    void Promise.all([
      supabase.from("courses").select("*"),
      supabase.from("tees").select("*"),
    ]).then(([c, t]) => {
      setCourses(c.data || []);
      setTees(t.data || []);
    });
  }, []);
  const summary = summarize(scores);
  function change(i: number, key: keyof Hole, value: number | boolean | null) {
    setScores((s) => s.map((h, j) => (j === i ? { ...h, [key]: value } : h)));
  }
  async function save(form: HTMLFormElement, status: string) {
    const f = new FormData(form);
    if (!form.reportValidity()) return;
    if (status !== "draft" && !summary.complete) {
      data.notify("Captura los golpes de todos los hoyos para finalizar.");
      return;
    }
    if (
      scores.some(
        (h) =>
          (h.strokes !== null && (h.strokes < 1 || h.strokes > 30)) ||
          (h.par !== null && (h.par < 3 || h.par > 6)) ||
          (h.putts !== null &&
            h.putts !== undefined &&
            (h.putts < 0 || h.putts > 30)),
      )
    ) {
      data.notify("Revisa los golpes, pars y putts.");
      return;
    }
    setBusy(true);
    const payload = {
      user_id: data.user?.id,
      club_id: clubId || null,
      tee_id: teeId || null,
      played_at: f.get("date"),
      holes: count,
      tee: f.get("tee"),
      course: f.get("course"),
      status,
      privacy: f.get("privacy"),
      verified: false,
      notes: f.get("notes"),
      scores,
    };
    const ok = await data.run(
      () =>
        round
          ? supabase!.from("rounds").update(payload).eq("id", round.id)
          : supabase!.from("rounds").insert(payload),
      "Ronda guardada. Tus estadísticas se actualizaron.",
    );
    setBusy(false);
    if (ok) onDone();
  }
  return (
    <form id="score-form" className="form" onSubmit={(e) => e.preventDefault()}>
      <div className="notice">
        <Flag size={17} />
        Selecciona un tee configurado o captura los datos de tu tarjeta real. La
        captura manual siempre queda marcada como no verificada.
      </div>
      <div className="form-grid">
        <Field label="Club / campo">
          <select
            name="club"
            value={clubId}
            onChange={(e) => {
              setClubId(e.target.value);
              setTeeId("");
              setScores((s) =>
                s.map((h) => ({
                  ...h,
                  par: null,
                  distance: null,
                  index: null,
                })),
              );
            }}
          >
            <option value="">Otro campo</option>
            {data.clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha">
          <input
            name="date"
            type="date"
            required
            max={new Date().toLocaleDateString("en-CA", {
              timeZone: "America/Mexico_City",
            })}
            defaultValue={
              round?.played_at ||
              new Date().toLocaleDateString("en-CA", {
                timeZone: "America/Mexico_City",
              })
            }
          />
        </Field>
        <Field label="Recorrido">
          <input
            name="course"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            readOnly={!!teeId}
            placeholder="Nombre del recorrido"
          />
        </Field>
        <Field label="Tee de salida">
          <input
            name="tee"
            required
            value={teeName}
            onChange={(e) => setTeeName(e.target.value)}
            readOnly={!!teeId}
            placeholder="Ej. Blancas (declarado)"
          />
        </Field>
        <Field label="Modalidad">
          <select
            value={count}
            onChange={(e) => {
              const n = Number(e.target.value);
              setCount(n);
              setNine(0);
              setScores((old) =>
                Array.from(
                  { length: n },
                  (_, i) =>
                    old[i] || {
                      hole: i + 1,
                      par: null,
                      strokes: null,
                      putts: null,
                      fairway: null,
                      gir: null,
                    },
                ),
              );
            }}
          >
            <option value={18}>18 hoyos</option>
            <option value={9}>9 hoyos</option>
          </select>
        </Field>
        <Field label="Privacidad del score">
          <select name="privacy" defaultValue={round?.privacy || "private"}>
            <option value="private">Solo yo</option>
            <option value="public">Comunidad</option>
            <option value="followers">Seguidores aprobados</option>
          </select>
        </Field>
      </div>
      <Field label="Configuración del campo">
        <select
          value={teeId}
          onChange={async (e) => {
            const id = e.target.value;
            if (!id) {
              setTeeId("");
              setScores((s) =>
                s.map((h) => ({
                  ...h,
                  par: null,
                  distance: null,
                  index: null,
                })),
              );
              return;
            }
            const { data: holes, error } = await supabase!
              .from("holes")
              .select("*")
              .eq("tee_id", id)
              .order("hole");
            if (error || !holes || holes.length < count) {
              data.notify(
                "Este tee aún no tiene configuración completa. Usa captura manual.",
              );
              return;
            }
            setTeeId(id);
            const t = tees.find((t) => t.id === id)!;
            setTeeName(t.name);
            setCourseName(
              courses.find((c) => c.id === t.course_id)?.name || "",
            );
            setScores((s) =>
              s.map((h, i) => ({
                ...h,
                par: holes[i].par,
                distance: holes[i].distance,
                index: holes[i].index,
              })),
            );
          }}
        >
          <option value="">Captura manual · No verificada</option>
          {tees
            .filter(
              (t) =>
                courses.find((c) => c.id === t.course_id)?.club_id === clubId,
            )
            .map((t) => (
              <option value={t.id} key={t.id}>
                {courses.find((c) => c.id === t.course_id)?.name} · {t.name}{" "}
                {t.verified ? "(configuración verificada)" : "(por confirmar)"}
              </option>
            ))}
        </select>
      </Field>
      <div className="score-summary">
        <div>
          <span>Golpes</span>
          <strong>{summary.total || "—"}</strong>
        </div>
        <div>
          <span>Contra par</span>
          <strong>
            {summary.relative === null
              ? "—"
              : summary.relative > 0
                ? "+" + summary.relative
                : summary.relative}
          </strong>
        </div>
        <div>
          <span>Ida / vuelta</span>
          <strong>
            {summary.out} / {count === 18 ? summary.in : "—"}
          </strong>
        </div>
        <div>
          <span>Birdies / pars</span>
          <strong>
            {summary.birdies} / {summary.pars}
          </strong>
        </div>
      </div>
      <div className="score-navigation">
        <h3>{nine === 0 ? "Ida · Hoyos 1–9" : "Vuelta · Hoyos 10–18"}</h3>
        {count === 18 && (
          <div>
            <button
              type="button"
              className="icon-btn"
              aria-label="Primeros 9"
              onClick={() => setNine(0)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Últimos 9"
              onClick={() => setNine(1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
      <div className="score-table-wrap">
        <table className="score-table">
          <thead>
            <tr>
              <th>Hoyo</th>
              {scores.slice(nine * 9, nine * 9 + 9).map((h) => (
                <th key={h.hole}>{h.hole}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["par", "Par"],
              ["index", "Índice"],
              ["distance", "Distancia (m)"],
              ["strokes", "Golpes"],
              ["putts", "Putts"],
            ].map(([key, label]) => (
              <tr key={key}>
                <th>{label}</th>
                {scores.slice(nine * 9, nine * 9 + 9).map((h, j) => (
                  <td
                    key={h.hole}
                    className={key === "strokes" ? holeColor(h) : ""}
                  >
                    <input
                      aria-label={`${label}, hoyo ${h.hole}`}
                      type="number"
                      readOnly={
                        !!teeId && ["par", "index", "distance"].includes(key)
                      }
                      min={key === "par" ? 3 : key === "putts" ? 0 : 1}
                      max={
                        key === "par"
                          ? 6
                          : key === "index"
                            ? 18
                            : key === "distance"
                              ? 900
                              : 30
                      }
                      value={
                        h[key as keyof Hole] === null ||
                        h[key as keyof Hole] === undefined
                          ? ""
                          : String(h[key as keyof Hole])
                      }
                      onChange={(e) =>
                        change(
                          nine * 9 + j,
                          key as keyof Hole,
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
            {[
              ["fairway", "Fairway"],
              ["gir", "Green en regulación"],
            ].map(([key, label]) => (
              <tr key={key}>
                <th>{label}</th>
                {scores.slice(nine * 9, nine * 9 + 9).map((h, j) => (
                  <td key={h.hole}>
                    <select
                      aria-label={`${label}, hoyo ${h.hole}`}
                      value={
                        h[key as keyof Hole] == null
                          ? ""
                          : String(h[key as keyof Hole])
                      }
                      onChange={(e) =>
                        change(
                          nine * 9 + j,
                          key as keyof Hole,
                          e.target.value === ""
                            ? null
                            : e.target.value === "true",
                        )
                      }
                    >
                      <option value="">—</option>
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                    </select>
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th>Contra par</th>
              {scores.slice(nine * 9, nine * 9 + 9).map((h) => (
                <td key={h.hole}>
                  {h.par !== null && h.strokes !== null
                    ? (h.strokes - h.par > 0 ? "+" : "") + (h.strokes - h.par)
                    : "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="score-legend">
        {[
          ["eagle", "Eagle o mejor"],
          ["birdie", "Birdie"],
          ["neutral", "Par"],
          ["bogey", "Bogey"],
          ["double", "Doble o peor"],
        ].map(([c, t]) => (
          <span key={c}>
            <i className={c} />
            {t}
          </span>
        ))}
      </div>
      <Field label="Comentarios de la ronda">
        <textarea
          name="notes"
          defaultValue={round?.notes}
          rows={2}
          maxLength={2000}
        />
      </Field>
      <div className="button-row">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={(e) => void save(e.currentTarget.form!, "draft")}
        >
          <Save size={16} />
          Borrador
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={(e) => void save(e.currentTarget.form!, "finished")}
        >
          Finalizar
        </Button>
        <Button
          type="button"
          disabled={busy}
          onClick={(e) => void save(e.currentTarget.form!, "published")}
        >
          <Send size={16} />
          Publicar score
        </Button>
      </div>
      <small>
        El handicap declarado se mantiene separado de estos resultados. Los
        datos opcionales vacíos no cuentan como cero.
      </small>
    </form>
  );
}
