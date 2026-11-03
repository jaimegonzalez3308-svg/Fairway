"use client";
import { ArrowUpRight } from "lucide-react";
import { summarize, type Round } from "@/lib/domain";
import type { useFairway } from "@/lib/use-fairway";
import { Button, Empty } from "./ui";

export function Rounds({
  data,
  onEdit,
  onNew,
}: {
  data: ReturnType<typeof useFairway>;
  onEdit: (r: Round) => void;
  onNew: () => void;
}) {
  return (
    <div className="panel round-history">
      <div className="panel-heading">
        <h3>Historial de rondas</h3>
        <span className="badge">{data.rounds.length} rondas</span>
      </div>
      {data.rounds.length ? (
        <div
          className="table-scroll"
          role="region"
          aria-label="Historial de rondas, desplaza para ver todas las columnas"
          tabIndex={0}
        >
          <table className="rounds-table">
            <caption className="sr-only">
              Tus rondas registradas, resultados y estado de publicación.
            </caption>
            <thead>
              <tr>
                <th scope="col">Campo / fecha</th>
                <th scope="col">Modalidad</th>
                <th scope="col">Score</th>
                <th scope="col">Contra par</th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rounds.map((r) => {
                const s = summarize(r.scores);
                return (
                  <tr key={r.id}>
                    <td>
                      <strong>
                        {data.clubs.find((c) => c.id === r.club_id)?.name ||
                          r.course ||
                          "Otro campo"}
                      </strong>
                      <small>
                        {r.played_at} ·{" "}
                        {r.verified
                          ? "Datos verificados"
                          : "Captura no verificada"}
                      </small>
                    </td>
                    <td>{r.holes} hoyos</td>
                    <td className="total-score">{s.total}</td>
                    <td>
                      {s.relative === null
                        ? "—"
                        : s.relative > 0
                          ? "+" + s.relative
                          : s.relative}
                    </td>
                    <td>
                      <span className="badge">
                        {r.status === "draft"
                          ? "Borrador"
                          : r.status === "published"
                            ? "Publicado"
                            : "Finalizado"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        aria-label="Abrir scorecard"
                        onClick={() => onEdit(r)}
                      >
                        <ArrowUpRight size={19} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="El primer score es el comienzo"
          description="Registra una ronda, hoyo por hoyo, y construye tu historial."
          action={<Button onClick={onNew}>Registrar mi primera ronda</Button>}
        />
      )}
    </div>
  );
}
