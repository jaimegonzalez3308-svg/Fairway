"use client";
import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingDown, Trophy, Flag, Target } from "lucide-react";
import { summarize, type Round } from "@/lib/domain";
import type { FairwayData } from "@/lib/use-fairway";
import { Empty } from "./ui";
export function Stats({ data }: { data: FairwayData }) {
  const [period, setPeriod] = useState("all");
  const rounds = data.rounds.filter((r) => {
    if (r.status === "draft") return false;
    if (period === "all") return true;
    const d = new Date();
    d.setMonth(d.getMonth() - Number(period));
    return new Date(r.played_at) >= d;
  });
  const totals = rounds.map((r) => summarize(r.scores).total);
  const average = totals.length
    ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)
    : "—";
  const all = rounds.flatMap((r) => r.scores);
  const putts = all.filter((h) => h.putts !== null && h.putts !== undefined);
  const gir = all.filter((h) => h.gir != null);
  const fairway = all.filter((h) => h.fairway != null);
  const pct = (rows: typeof all, key: "gir" | "fairway") =>
    rows.length
      ? Math.round(rows.filter((h) => h[key]).length / rows.length) + "%"
      : "Sin registros";
  return (
    <>
      <div className="toolbar">
        <span className="muted">
          Solo rondas finalizadas. Handicap declarado, no oficial.
        </span>
        <select
          aria-label="Periodo de estadísticas"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="1">Último mes</option>
          <option value="3">Últimos 3 meses</option>
          <option value="12">Último año</option>
          <option value="all">Todo el historial</option>
        </select>
      </div>
      <div className="stat-grid">
        {[
          [Flag, "Handicap declarado", data.me.handicap ?? "—"],
          [Target, "Score promedio", average],
          [Trophy, "Mejor ronda", totals.length ? Math.min(...totals) : "—"],
          [TrendingDown, "Rondas registradas", totals.length],
        ].map(([Icon, label, value]) => {
          const I = Icon as typeof Flag;
          return (
            <div className="stat-card" key={String(label)}>
              <I size={20} />
              <span>{String(label)}</span>
              <strong>{String(value)}</strong>
            </div>
          );
        })}
      </div>
      {!rounds.length ? (
        <Empty
          title="Cada ronda cuenta"
          description="Registra tu primer score para empezar a ver tu progreso."
        />
      ) : (
        <>
          <div className="panel chart">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">TU JUEGO, EN PERSPECTIVA</span>
                <h3>Evolución de tus scores</h3>
              </div>
              <span className="badge">Menos es más</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={rounds.map((r) => ({
                  date: r.played_at,
                  score: summarize(r.scores).total,
                }))}
              >
                <defs>
                  <linearGradient id="score-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7FA58D" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#7FA58D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="#e7e9e3"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    new Date(v + "T12:00:00").toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                    })
                  }
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={["dataMin - 5", "dataMax + 5"]}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="score"
                  name="Golpes"
                  stroke="#16382B"
                  strokeWidth={3}
                  fill="url(#score-fill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="stat-grid compact">
            {[
              ["Peor ronda", Math.max(...totals)],
              [
                "Birdies",
                all.filter((h) => h.par !== null && h.strokes! === h.par - 1)
                  .length,
              ],
              [
                "Pars",
                all.filter((h) => h.par !== null && h.strokes === h.par).length,
              ],
              [
                "Putts promedio",
                putts.length
                  ? (
                      putts.reduce((s, h) => s + h.putts!, 0) / putts.length
                    ).toFixed(1)
                  : "Sin registros",
              ],
              ["Greens en regulación", pct(gir, "gir")],
              ["Fairways", pct(fairway, "fairway")],
              ...[3, 4, 5].map((p) => {
                const s = all.filter((h) => h.par === p && h.strokes !== null);
                return [
                  `Promedio par ${p}`,
                  s.length
                    ? (
                        s.reduce((a, h) => a + h.strokes!, 0) / s.length
                      ).toFixed(1)
                    : "Sin registros",
                ];
              }),
            ].map(([l, v]) => (
              <div className="stat-card" key={l}>
                <span>{l}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <div className="panel">
            <h3>Rendimiento por club</h3>
            {data.clubs.map((c) => {
              const rs = rounds.filter((r) => r.club_id === c.id);
              if (!rs.length) return null;
              return (
                <div className="list-row" key={c.id}>
                  <span>{c.name}</span>
                  <strong>
                    {(
                      rs.reduce((s, r) => s + summarize(r.scores).total, 0) /
                      rs.length
                    ).toFixed(1)}{" "}
                    golpes · {rs.length} rondas
                  </strong>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
