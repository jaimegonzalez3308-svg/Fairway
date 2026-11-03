"use client";
import { useEffect, useState } from "react";
import { Bell, Fingerprint, RefreshCw, Trash2, WifiOff } from "lucide-react";
import { Button } from "./ui";
import { NativeDevice, type NativeDeviceStatus } from "@/lib/native-device";
import { NATIVE_RESUME } from "@/lib/native-support";
import {
  discardQueuedScore,
  NATIVE_OFFLINE_CHANGED,
  readQueuedScores,
  type QueuedScore,
} from "@/lib/native-offline";
import type { FairwayData } from "@/lib/use-fairway";

export function NativePreferences({ data }: { data: FairwayData }) {
  const [status, setStatus] = useState<NativeDeviceStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const refresh = () =>
    NativeDevice.status()
      .then(setStatus)
      .catch(() =>
        setMessage(
          "No pudimos consultar las funciones del iPhone. Intenta de nuevo.",
        ),
      );
  useEffect(() => {
    void refresh();
    window.addEventListener(NATIVE_RESUME, refresh);
    return () => window.removeEventListener(NATIVE_RESUME, refresh);
  }, []);
  return (
    <section
      className="panel native-preferences"
      aria-labelledby="native-preferences-title"
    >
      <h3 id="native-preferences-title">Tu iPhone</h3>
      <p>
        Busca Fairway en el selector de widgets del iPhone para abrir Scores y
        Partidas desde tu pantalla de inicio. El widget no muestra datos
        privados.
      </p>
      <div className="native-preference-row">
        <Fingerprint size={22} />
        <div>
          <strong>
            Proteger con {status?.biometricName || "Face ID o Touch ID"}
          </strong>
          <p>
            Bloquea Fairway al salir de la app. Conservas la sesión; puedes usar
            el código del iPhone si la biometría falla.
          </p>
          <Button
            variant="outline"
            disabled={
              busy ||
              !status ||
              (!status.biometricEnabled && !status.biometricAvailable) ||
              !data.user
            }
            onClick={async () => {
              if (!status) return;
              setBusy(true);
              setMessage("");
              try {
                await NativeDevice.setBiometricEnabled({
                  enabled: !status.biometricEnabled,
                });
                await refresh();
              } catch (error) {
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "No se cambió la protección.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {status?.biometricEnabled
              ? "Desactivar protección"
              : "Activar protección"}
          </Button>
          {status && !status.biometricAvailable && !status.biometricEnabled && (
            <p>
              Configura Face ID o Touch ID en Ajustes del iPhone para activarlo.
            </p>
          )}
        </div>
      </div>
      <div className="native-preference-row">
        <Bell size={22} />
        <div>
          <strong>Avisos de Fairway</strong>
          <p>
            Recibe un aviso cuando llegue un mensaje o cambie una partida. El
            aviso no muestra nombres ni conversaciones en la pantalla bloqueada.
            Puedes seguir usando la campana dentro de Fairway.
          </p>
          {!status?.pushConfigured ? (
            <p>Los avisos de este dispositivo todavía no están disponibles.</p>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={busy || !data.user}
                onClick={async () => {
                  setBusy(true);
                  setMessage("");
                  try {
                    const { enableNativePush } =
                      await import("@/lib/native-push");
                    await enableNativePush();
                    setMessage("Avisos activados en este iPhone.");
                    await refresh();
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : "No se pudieron activar los avisos.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {status.pushStatus === "authorized" ||
                status.pushStatus === "provisional"
                  ? "Conectar avisos de esta cuenta"
                  : "Activar avisos"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => void NativeDevice.openSettings()}
              >
                Ajustes del iPhone
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const { disconnectNativePush } =
                      await import("@/lib/native-push");
                    await disconnectNativePush();
                    setMessage(
                      "Avisos desconectados de Fairway en este iPhone.",
                    );
                  } catch {
                    setMessage(
                      "No se pudieron desconectar los avisos. Intenta de nuevo.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Desconectar avisos de esta cuenta
              </Button>
            </>
          )}
        </div>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <NativeOfflinePanel userId={data.user?.id} />
    </section>
  );
}

export function NativeOfflinePanel({ userId }: { userId?: string }) {
  const [rows, setRows] = useState<QueuedScore[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    setRows([]);
    const update = () => {
      if (userId)
        void readQueuedScores(userId)
          .then((value) => {
            if (current) setRows(value);
          })
          .catch(() => {
            if (current)
              setMessage(
                "No pudimos leer tus borradores. Desbloquea el iPhone e inténtalo de nuevo.",
              );
          });
    };
    update();
    window.addEventListener(NATIVE_OFFLINE_CHANGED, update);
    return () => {
      current = false;
      window.removeEventListener(NATIVE_OFFLINE_CHANGED, update);
    };
  }, [userId]);
  if (!rows.length && !message) return null;
  return (
    <section
      className="native-offline-panel"
      aria-label="Scores pendientes de sincronizar"
    >
      <h3>
        <WifiOff size={19} /> {rows.length} borrador
        {rows.length === 1 ? "" : "es"} en este iPhone
      </h3>
      <p>
        Son privados y todavía no se han subido. Se sincronizan al reconectar.
        Cerrar sesión elimina los borradores que queden en este dispositivo.
      </p>
      <Button
        variant="outline"
        onClick={() => {
          window.dispatchEvent(new Event("fairway:sync-scores"));
          setMessage(
            "Intentando sincronizar. Si no hay conexión, los borradores se conservan aquí.",
          );
        }}
      >
        <RefreshCw size={16} /> Sincronizar ahora
      </Button>
      {rows.map((row) => (
        <article key={row.id}>
          <details>
            <summary>
              {row.course || "Tarjeta de golf"} · {row.played_at} · {row.holes}{" "}
              hoyos
            </summary>
            <p>{row.notes || "Sin notas"}</p>
            <div className="native-draft-holes">
              {row.scores.map((hole) => (
                <span key={hole.hole}>
                  Hoyo {hole.hole}: {hole.strokes ?? "—"} golpes
                </span>
              ))}
            </div>
          </details>
          {confirm === row.id ? (
            <div className="button-row">
              <Button
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  if (!userId) return;
                  setBusy(true);
                  try {
                    await discardQueuedScore(row.id, userId);
                    setConfirm(null);
                  } catch {
                    setMessage(
                      "No se pudo eliminar el borrador. Intenta de nuevo.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Eliminar borrador de este iPhone
              </Button>
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Conservar
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="text-button"
              onClick={() => setConfirm(row.id)}
            >
              <Trash2 size={15} /> Eliminar borrador
            </button>
          )}
        </article>
      ))}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
