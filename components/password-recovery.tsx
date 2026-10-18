"use client";

import { useEffect, useState } from "react";
import { Button, Field } from "./ui";
import { AccessibilityToggle } from "./accessibility-mode";
import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth";
import {
  requestPasswordReset,
  updateRecoveredPassword,
} from "@/lib/password-reset";

export function PasswordResetRequest({
  onBack,
  initialEmail = "",
  initialMessage = "",
}: {
  onBack: () => void;
  initialEmail?: string;
  initialMessage?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState(initialMessage);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (!wait) return;
    const timer = setTimeout(() => setWait((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  return (
    <form
      className="form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!supabase || busy || wait) return;
        setBusy(true);
        setMessage("");
        try {
          await requestPasswordReset(
            supabase.auth,
            email,
            window.location.origin,
          );
          setMessage(
            "Si hay una cuenta con este correo, recibirás un enlace para crear una nueva contraseña. Revisa también spam y abre solo el mensaje más reciente. Si usaste Google, también puedes entrar con ese botón.",
          );
          setWait(60);
        } catch (error) {
          setMessage(
            authErrorMessage(error as { code?: string; message?: string }),
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Escribe el correo de tu cuenta. Te enviaremos un enlace para crear una
        contraseña nueva.
      </p>
      <Field label="Correo electrónico">
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      <Button disabled={!supabase || busy || wait > 0}>
        {busy
          ? "Solicitando enlace…"
          : wait
            ? `Solicitar otro en ${wait} s`
            : "Enviar enlace de recuperación"}
      </Button>
      <button
        type="button"
        className="text-button"
        onClick={onBack}
        disabled={busy}
      >
        Volver a iniciar sesión
      </button>
    </form>
  );
}

export function PasswordRecovery({
  ready,
  signedIn,
  error,
  onDone,
  onExit,
}: {
  ready: boolean;
  signedIn: boolean;
  error: string | null;
  onDone: () => void;
  onExit: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  return (
    <main className="auth-screen">
      <section className="panel" aria-labelledby="password-recovery-title">
        <AccessibilityToggle />
        <span className="eyebrow">FAIRWAY · TU CUENTA</span>
        <h1 id="password-recovery-title">
          {complete ? "Contraseña actualizada" : "Recupera tu contraseña"}
        </h1>
        {!ready ? (
          <p role="status">Comprobando tu enlace…</p>
        ) : complete ? (
          <>
            <p role="status">
              Tu nueva contraseña ya está guardada. Puedes usarla la próxima vez
              que inicies sesión.
            </p>
            <Button onClick={onDone}>Entrar a Fairway</Button>
          </>
        ) : error || !signedIn ? (
          <PasswordResetRequest
            onBack={onExit}
            initialMessage={
              error ||
              "Abre el enlace de tu correo para cambiar la contraseña. Si ya venció o lo usaste antes, solicita otro aquí."
            }
          />
        ) : (
          <form
            className="form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!supabase || busy) return;
              setBusy(true);
              setMessage("");
              try {
                await updateRecoveredPassword(
                  supabase.auth,
                  password,
                  confirmation,
                );
                setPassword("");
                setConfirmation("");
                setComplete(true);
              } catch (error) {
                setMessage(
                  authErrorMessage(
                    error as { code?: string; message?: string },
                  ),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>Elige una contraseña de al menos 10 caracteres.</p>
            <Field label="Nueva contraseña">
              <input
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Field label="Repite la nueva contraseña">
              <input
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </Field>
            {message && (
              <div className="notice" role="alert">
                {message}
              </div>
            )}
            <Button disabled={busy || !supabase}>
              {busy ? "Guardando…" : "Guardar nueva contraseña"}
            </Button>
            <button
              type="button"
              className="text-button"
              onClick={onExit}
              disabled={busy}
            >
              Cancelar
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
