"use client";
import { useState, useEffect } from "react";
import { Button, Field, Empty } from "./ui";
import type { FairwayData } from "@/lib/use-fairway";
import { supabase } from "@/lib/supabase";
export function Settings({
  data,
  onEdit,
  onLogout,
  onDelete,
}: {
  data: FairwayData;
  onEdit: () => void;
  onLogout: () => void;
  onDelete: () => void;
}) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({}),
    [followers, setFollowers] = useState<{ user_id: string }[]>([]),
    [password, setPassword] = useState("");
  useEffect(() => {
    if (!supabase || !data.user) return;
    void supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", data.user.id)
      .then(({ data: r }) =>
        setPrefs(
          Object.fromEntries((r || []).map((p) => [p.category, p.enabled])),
        ),
      );
    void supabase
      .from("followers")
      .select("user_id")
      .eq("target_id", data.user.id)
      .eq("approved", false)
      .then(({ data: r }) => setFollowers(r || []));
  }, [data.user]);
  return (
    <div className="settings-grid">
      <div className="panel">
        <h3>Tu cuenta, a tu manera</h3>
        <p>Controla la visibilidad de tu perfil y de cada score.</p>
        <Button variant="outline" onClick={onEdit}>
          Editar perfil y privacidad
        </Button>
        <div className="button-row">
          <Button variant="outline" onClick={onLogout}>
            Cerrar sesión
          </Button>
        </div>
        <hr />
        <h3>Notificaciones</h3>
        {[
          ["matches", "Likes y matches"],
          ["friends", "Amigos y solicitudes de amistad"],
          ["messages", "Mensajes"],
          ["games", "Partidas y solicitudes"],
          ["community", "Comentarios y reacciones"],
          ["reviews", "Calificaciones"],
        ].map(([k, label]) => (
          <label className="switch-row" key={k}>
            <span>{label}</span>
            <input
              type="checkbox"
              checked={prefs[k] ?? true}
              onChange={async (e) => {
                const enabled = e.target.checked;
                const ok = await data.run(() =>
                  supabase!
                    .from("notification_preferences")
                    .upsert({ user_id: data.user!.id, category: k, enabled }),
                );
                if (ok) setPrefs((p) => ({ ...p, [k]: enabled }));
              }}
            />
          </label>
        ))}
        <hr />
        <h3>Solicitudes de seguimiento</h3>
        {!followers.length && <p>No tienes solicitudes pendientes.</p>}
        {followers.map((f) => (
          <div className="list-row" key={f.user_id}>
            <span>
              {data.profiles.find((p) => p.id === f.user_id)?.name ||
                "Golfista"}
            </span>
            <Button
              variant="outline"
              onClick={async () => {
                const ok = await data.run(() =>
                  supabase!
                    .from("followers")
                    .update({ approved: true })
                    .eq("user_id", f.user_id)
                    .eq("target_id", data.user!.id),
                );
                if (ok)
                  setFollowers((x) => x.filter((p) => p.user_id !== f.user_id));
              }}
            >
              Aprobar
            </Button>
          </div>
        ))}
        <hr />
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!supabase || !data.user) {
              data.notify("Conecta Supabase e inicia sesión.");
              return;
            }
            const { error } = await supabase.auth.updateUser({ password });
            data.notify(error?.message || "Contraseña actualizada.");
            if (!error) setPassword("");
          }}
        >
          <Field label="Cambiar contraseña">
            <input
              type="password"
              minLength={10}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button variant="outline">Actualizar contraseña</Button>
        </form>
      </div>
      <div>
        <div className="panel privacy">
          <span className="eyebrow">PRIVACIDAD</span>
          <h3>Tú decides qué compartir</h3>
          <p>
            Fairway utiliza tu perfil, club declarado, disponibilidad y
            actividad para encontrar compañeros y organizar rondas. Tu correo se
            conserva en el proveedor de autenticación y no se publica.
          </p>
          <p>
            No recopilamos tu ubicación GPS exacta ni mostramos una fecha de
            nacimiento completa. Cada score tiene su propio control de
            visibilidad.
          </p>
          <p>
            Las imágenes se almacenan en un depósito privado. Bloquear a alguien
            limita el acceso mutuo al perfil y a las conversaciones.
          </p>
          <div className="notice">
            Antes del lanzamiento público, el operador debe completar su aviso
            de privacidad con identidad, domicilio y canal para solicitudes de
            acceso, rectificación, cancelación y oposición. La plataforma está
            en preparación.
          </div>
        </div>
        <div className="panel danger-zone">
          <h3>Eliminar cuenta y datos</h3>
          <p>
            Eliminará tu perfil y los datos asociados. Esta acción no se puede
            deshacer.
          </p>
          <p>
            Te pediremos tu contraseña y una confirmación nueva por correo antes
            del borrado definitivo.
          </p>
          <Button variant="outline" onClick={onDelete}>
            Solicitar eliminación de cuenta
          </Button>
        </div>
      </div>
    </div>
  );
}
export function Admin({ data }: { data: FairwayData }) {
  const [metrics, setMetrics] = useState({ profiles: 0, games: 0, reviews: 0 });
  useEffect(() => {
    if (!data.admin || !supabase) return;
    void Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("games").select("*", { count: "exact", head: true }),
      supabase.from("reviews").select("*", { count: "exact", head: true }),
    ]).then(([p, g, r]) =>
      setMetrics({
        profiles: p.count || 0,
        games: g.count || 0,
        reviews: r.count || 0,
      }),
    );
  }, [data.admin]);
  const [tab, setTab] = useState("Clubes"),
    [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const tables: Record<string, string> = {
    Clubes: "clubs",
    Usuarios: "account_roles",
    Reportes: "reports",
    Verificaciones: "verification_requests",
    Publicaciones: "posts",
    Recorridos: "courses",
    Tees: "tees",
    Hoyos: "holes",
  };
  async function load() {
    if (!data.admin || !supabase) return;
    const { data: r, error } = await supabase
      .from(tables[tab])
      .select("*")
      .limit(100);
    if (error) data.notify(error.message);
    else setRows(r || []);
  }
  useEffect(() => {
    void load();
  }, [tab, data.admin]);
  if (!data.admin)
    return (
      <Empty
        title="Acceso restringido"
        description="Los permisos administrativos se comprueban en PostgreSQL. No tienes un rol de administrador."
      />
    );
  return (
    <>
      <div className="stat-grid compact">
        {[
          ["Golfistas", metrics.profiles],
          ["Partidas", metrics.games],
          ["Evaluaciones", metrics.reviews],
        ].map(([label, value]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="tabs">
        {Object.keys(tables).map((t) => (
          <button
            key={t}
            className={t === tab ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="panel">
        <h3>{tab}</h3>
        <p>
          Los registros sin verificar deben confirmarse antes de marcarse como
          oficiales.
        </p>
        {tab === "Clubes" && (
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const ok = await data.run(
                () =>
                  supabase!
                    .from("clubs")
                    .insert({ name: f.get("name"), city: f.get("city") }),
                "Club agregado.",
              );
              if (ok) void load();
            }}
          >
            <input
              name="name"
              placeholder="Nombre del club"
              aria-label="Nombre del club"
              required
            />
            <input
              name="city"
              placeholder="Ciudad"
              aria-label="Ciudad del club"
              required
            />
            <Button>Agregar club</Button>
          </form>
        )}
        {rows.map((row, i) => (
          <div className="admin-row" key={String(row.id || row.user_id || i)}>
            <pre>{JSON.stringify(row, null, 2)}</pre>
            <div className="button-row">
              {tab === "Usuarios" ? (
                <Button
                  variant="outline"
                  onClick={async () => {
                    await data.run(() =>
                      supabase!
                        .from("account_roles")
                        .update({ suspended: !row.suspended })
                        .eq("user_id", row.user_id),
                    );
                    void load();
                  }}
                >
                  {row.suspended ? "Reactivar" : "Suspender"}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const json = window.prompt(
                        "Edita los campos como JSON válido. Los permisos y restricciones se aplican en la base de datos.",
                        JSON.stringify(row, null, 2),
                      );
                      if (!json) return;
                      try {
                        const parsed = JSON.parse(json);
                        let query = supabase!.from(tables[tab]).update(parsed);
                        query =
                          tab === "Hoyos"
                            ? query
                                .eq("tee_id", row.tee_id)
                                .eq("hole", row.hole)
                            : query.eq("id", row.id);
                        await data.run(() => query);
                        void load();
                      } catch {
                        data.notify("JSON no válido.");
                      }
                    }}
                  >
                    Editar
                  </Button>
                  {tab === "Clubes" && (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            "¿Eliminar este club? Si hay partidas asociadas, la base de datos impedirá la eliminación.",
                          )
                        )
                          return;
                        await data.run(() =>
                          supabase!.from("clubs").delete().eq("id", row.id),
                        );
                        void load();
                      }}
                    >
                      Eliminar
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        {["Recorridos", "Tees", "Hoyos"].includes(tab) && (
          <Button
            variant="outline"
            onClick={async () => {
              const sample =
                tab === "Recorridos"
                  ? {
                      club_id: "UUID del club",
                      name: "Nombre",
                      verified: false,
                    }
                  : tab === "Tees"
                    ? {
                        course_id: "UUID del recorrido",
                        name: "Blancas",
                        verified: false,
                      }
                    : {
                        tee_id: "UUID del tee",
                        hole: 1,
                        par: 4,
                        distance: 350,
                        index: 7,
                      };
              const json = window.prompt(
                "Introduce un registro real en JSON. No uses valores de ejemplo como oficiales.",
                JSON.stringify(sample, null, 2),
              );
              if (!json) return;
              try {
                await data.run(() =>
                  supabase!.from(tables[tab]).insert(JSON.parse(json)),
                );
                void load();
              } catch {
                data.notify("JSON no válido.");
              }
            }}
          >
            Agregar configuración
          </Button>
        )}
      </div>
    </>
  );
}
