"use client";
import { useState } from "react";
import { Button, Field, Modal } from "./ui";
import { NativeApple } from "@/lib/native-apple-auth";
import { supabase } from "@/lib/supabase";
import type { FairwayData } from "@/lib/use-fairway";

export function AppleDeleteAccount({
  data,
  onClose,
  onDeleted,
}: {
  data: FairwayData;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title="Eliminar mi cuenta"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p>
        Se eliminarán tu perfil, tus fotografías y los datos asociados.
        Desconectaremos el permiso de Apple. Esta acción no se puede deshacer.
      </p>
      <p>
        Confirma con Apple para comprobar que eres tú. Si usas otra cuenta de
        Apple, el borrado se rechazará.
      </p>
      <Field label="Escribe ELIMINAR para confirmar">
        <input
          autoComplete="off"
          value={confirmation}
          disabled={busy}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </Field>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      <Button
        disabled={busy || confirmation !== "ELIMINAR"}
        onClick={async () => {
          if (!supabase || !data.user || busy) return;
          setBusy(true);
          setError("");
          try {
            const ready = await supabase.rpc("native_service_status");
            if (ready.error || ready.data?.apple !== true)
              throw new Error(
                "La eliminación con Apple todavía no está disponible. Tu cuenta se conserva.",
              );
            const credential = await NativeApple.authorize();
            if (credential.cancelled) return;
            document.documentElement.setAttribute(
              "data-apple-deleting",
              "true",
            );
            const result = await supabase.functions.invoke(
              "delete-apple-account",
              {
                body: {
                  confirmation,
                  code: credential.authorizationCode,
                  nonce: credential.nonce,
                },
              },
            );
            if (result.error || result.data?.deleted !== true)
              throw new Error(
                result.data?.error ||
                  "No se completó la eliminación. Tu cuenta puede seguir disponible; revisa tu conexión y vuelve a intentar.",
              );
            await supabase.auth.signOut({ scope: "local" });
            data.notify("Cuenta eliminada y Apple desconectado.");
            onDeleted();
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "No se completó la eliminación.",
            );
          } finally {
            document.documentElement.removeAttribute("data-apple-deleting");
            setBusy(false);
          }
        }}
      >
        {busy ? "Comprobando y eliminando…" : "Confirmar con Apple y eliminar"}
      </Button>
    </Modal>
  );
}
