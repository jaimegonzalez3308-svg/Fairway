"use client";
import { useId, useState } from "react";
import { Pencil } from "lucide-react";
import { Button, Field } from "./ui";
import { profileSchema } from "@/lib/domain";

export function ProfileBio({
  bio,
  onEdit,
}: {
  bio: string;
  onEdit?: () => void;
}) {
  const heading = useId();
  const hasBio = !!bio.trim();
  if (!hasBio && !onEdit) return null;
  return (
    <section
      className={
        onEdit ? "panel profile-bio" : "profile-bio profile-bio-embedded"
      }
      aria-labelledby={heading}
    >
      <div className="profile-bio-heading">
        <h3 id={heading}>Biografía</h3>
        {onEdit && (
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil size={15} aria-hidden="true" />
            {hasBio ? "Editar bio" : "Añadir bio"}
          </Button>
        )}
      </div>
      <p className="profile-bio-text">
        {hasBio
          ? bio
          : "Cuéntales a otros golfistas qué disfrutas del golf y qué tipo de ronda te gusta jugar."}
      </p>
    </section>
  );
}

export function ProfileBioEditor({
  initialBio,
  onSave,
  onDone,
}: {
  initialBio: string;
  onSave: (bio: string) => Promise<boolean>;
  onDone: () => void;
}) {
  const [bio, setBio] = useState(initialBio);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        const parsed = profileSchema.shape.bio.safeParse(bio.trim());
        if (!parsed.success) {
          setError("Usa hasta 500 caracteres para tu biografía.");
          return;
        }
        setError("");
        setBusy(true);
        try {
          const saved = await onSave(parsed.data);
          setBusy(false);
          if (saved) onDone();
          else setError("No se pudo guardar la biografía. Inténtalo de nuevo.");
        } catch {
          setBusy(false);
          setError(
            "No se pudo guardar la biografía. Revisa tu conexión e inténtalo de nuevo.",
          );
        }
      }}
    >
      <Field
        label="Biografía (opcional)"
        hint="Hasta 500 caracteres. Visible para quienes puedan ver tu perfil. Puedes dejarla vacía para eliminarla."
      >
        <textarea
          autoFocus
          rows={5}
          maxLength={500}
          disabled={busy}
          value={bio}
          placeholder="Juego los sábados por la mañana, prefiero caminar el campo y siempre me apunto a 9 hoyos."
          onChange={(event) => {
            setBio(event.target.value);
            setError("");
          }}
        />
        <small className="bio-character-count" aria-hidden="true">
          {bio.length}/500 caracteres
        </small>
      </Field>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className="button-row">
        <Button disabled={busy}>
          {busy ? "Guardando…" : "Guardar biografía"}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
