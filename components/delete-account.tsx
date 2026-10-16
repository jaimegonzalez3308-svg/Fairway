"use client";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button, Field, Modal } from "./ui";
import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth";
import type { FairwayData } from "@/lib/use-fairway";

type Status = { expires_at: string; email_confirmed: boolean };
export function DeleteAccountDialog({
  data,
  onClose,
  onDeleted,
}: {
  data: FairwayData;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [password, setPassword] = useState(""),
    [status, setStatus] = useState<Status | null>(null),
    [loading, setLoading] = useState(true),
    [available, setAvailable] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [mailSent, setMailSent] = useState(false);
  useEffect(() => {
    if (!mailSent) return;
    const t = setTimeout(() => setMailSent(false), 60000);
    return () => clearTimeout(t);
  }, [mailSent]);
  async function refresh() {
    if (!supabase || !data.user) {
      setLoading(false);
      setAvailable(false);
      return null;
    }
    const { data: rows, error } = await supabase.rpc("account_deletion_status");
    if (error) {
      setAvailable(false);
      setError(
        error.code === "PGRST202"
          ? "La eliminación segura todavía no está activada. Tu cuenta sigue intacta. Inténtalo más tarde."
          : authErrorMessage(error),
      );
      setLoading(false);
      return null;
    }
    const next = (rows?.[0] as Status | undefined) || null;
    setStatus(next);
    setAvailable(true);
    setLoading(false);
    return next;
  }
  useEffect(() => {
    void refresh();
  }, [data.user?.id]);
  async function sendEmail() {
    if (!supabase || !data.user?.email) return;
    const { error } = await supabase.auth.signInWithOtp({
      email: data.user.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: new URL("/?delete_account=1", window.location.origin)
          .href,
      },
    });
    if (error) throw error;
    setMailSent(true);
    setNotice(
      "Te enviamos un enlace para confirmar tu identidad antes de eliminar la cuenta. Abre el correo más reciente y vuelve a Fairway para confirmar el borrado. El enlace no elimina tu cuenta por sí solo.",
    );
  }
  async function begin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !data.user?.email || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const signed = await supabase.auth.signInWithPassword({
        email: data.user.email,
        password,
      });
      setPassword("");
      if (signed.error) throw signed.error;
      if (signed.data.user.id !== data.user.id)
        throw new Error(
          "La cuenta autenticada no coincide. Cierra sesión y vuelve a entrar.",
        );
      const { error } = await supabase.rpc("begin_account_deletion");
      if (error) throw error;
      await refresh();
      await sendEmail();
    } catch (e) {
      setError(authErrorMessage(e as { code?: string; message?: string }));
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!supabase || busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("cancel_account_deletion");
    setBusy(false);
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    setStatus(null);
    setNotice("La solicitud fue cancelada. Tu cuenta se conserva.");
    setMailSent(false);
    setConfirmation("");
  }
  async function remove() {
    if (!supabase || !data.user || confirmation !== "ELIMINAR" || busy) return;
    setBusy(true);
    setError("");
    try {
      const current = await refresh();
      if (!current?.email_confirmed)
        throw new Error(
          "Confirma primero el enlace del correo. Si venció, inicia una solicitud nueva.",
        );
      // Se valida la confirmación antes de eliminar cualquier fotografía.
      let more = true;
      while (more) {
        const files = await supabase.storage
          .from("profile-images")
          .list(data.user.id, { limit: 100 });
        if (files.error) throw files.error;
        const paths = (files.data || [])
          .filter((f) => f.name !== ".emptyFolderPlaceholder")
          .map((f) => data.user!.id + "/" + f.name);
        if (!paths.length) break;
        const result = await supabase.storage
          .from("profile-images")
          .remove(paths);
        if (result.error) throw result.error;
        more = (files.data?.length || 0) === 100;
      }
      const result = await supabase.rpc("delete_my_account");
      if (result.error) throw result.error;
      await supabase.auth.signOut({ scope: "local" });
      data.notify("Tu cuenta y los datos asociados fueron eliminados.");
      onDeleted();
    } catch (e) {
      setError(authErrorMessage(e as { code?: string; message?: string }));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Eliminar mi cuenta"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="deletion-intro">
        <span>
          <ShieldCheck size={26} />
        </span>
        <p>
          Queremos asegurarnos de que eres tú. Primero verificamos tu contraseña
          y después tu correo.
        </p>
      </div>
      <ol className="deletion-steps">
        <li className={!status ? "current" : "done"}>
          <LockKeyhole size={16} />
          Contraseña
        </li>
        <li
          className={
            status && !status.email_confirmed
              ? "current"
              : status?.email_confirmed
                ? "done"
                : ""
          }
        >
          <Mail size={16} />
          Correo
        </li>
        <li className={status?.email_confirmed ? "current" : ""}>
          <Trash2 size={16} />
          Confirmación
        </li>
      </ol>
      {loading ? (
        <p role="status">Comprobando la seguridad de tu cuenta…</p>
      ) : (
        available &&
        (!status ? (
          <form className="form" onSubmit={begin}>
            <Field label="Tu contraseña actual">
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <p>
              Enviaremos la confirmación a <strong>{data.user?.email}</strong>.
            </p>
            <Button disabled={busy || !password}>
              {busy ? "Verificando…" : "Verificar y enviar correo"}
              <ArrowRight size={16} />
            </Button>
          </form>
        ) : status.email_confirmed ? (
          <div className="form">
            <div className="notice">
              <Check size={17} />
              Tu identidad y tu correo están confirmados.
            </div>
            <div className="deletion-warning">
              <AlertTriangle size={20} />
              <p>
                Se eliminarán tu perfil, fotografías, mensajes, partidas que
                organizaste, scores y publicaciones. Esta acción es definitiva.
              </p>
            </div>
            <Field label="Escribe ELIMINAR para confirmar">
              <input
                autoComplete="off"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="ELIMINAR"
              />
            </Field>
            <Button
              className="danger-button"
              disabled={busy || confirmation !== "ELIMINAR"}
              onClick={() => void remove()}
            >
              {busy ? "Eliminando…" : "Eliminar definitivamente mi cuenta"}
              <Trash2 size={16} />
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void cancel()}
            >
              Conservar mi cuenta
            </Button>
          </div>
        ) : (
          <div className="form">
            <div className="email-check-illustration">
              <Mail size={34} />
            </div>
            <h3>Revisa tu correo</h3>
            <p>
              Abre el enlace enviado a <strong>{data.user?.email}</strong>. La
              solicitud vence a las{" "}
              {new Date(status.expires_at).toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/Mexico_City",
              })}
              .
            </p>
            <p>
              Ese enlace confirma tu identidad. Después tendrás que confirmar la
              eliminación dentro de Fairway.
            </p>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const next = await refresh();
                  if (!next?.email_confirmed)
                    setNotice(
                      "La confirmación todavía está pendiente. Abre el enlace del correo más reciente.",
                    );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Ya abrí el correo, comprobar
            </Button>
            <Button
              variant="outline"
              disabled={busy || mailSent}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await sendEmail();
                } catch (e) {
                  setError(
                    authErrorMessage(e as { message?: string; code?: string }),
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {mailSent ? "Correo enviado" : "Enviar enlace de confirmación"}
            </Button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void cancel()}
            >
              Cancelar solicitud
            </button>
          </div>
        ))
      )}
      {notice && (
        <div role="status" className="notice deletion-notice">
          {notice}
        </div>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <small>
        La contraseña se verifica directamente con Supabase Auth y no se guarda
        en Fairway.
      </small>
    </Modal>
  );
}
