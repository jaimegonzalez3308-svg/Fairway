"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Field } from "./ui";
import { prepareProfileImage, profileImageError } from "@/lib/profile-images";

export function ProfilePhotoPicker({
  currentPhoto,
  value,
  onChange,
  disabled = false,
}: {
  currentPhoto: string;
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [value, currentPhoto]);
  useEffect(() => {
    if (!value) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);
  return (
    <div className="profile-photo-picker">
      <img
        key={preview || currentPhoto}
        src={preview || currentPhoto || "/images/avatar.svg"}
        className="profile-photo-preview"
        alt={
          value
            ? "Vista previa de tu nueva foto de perfil"
            : "Foto de perfil actual"
        }
        onError={(event) => {
          setImageFailed(true);
          if (!event.currentTarget.src.endsWith("/images/avatar.svg"))
            event.currentTarget.src = "/images/avatar.svg";
        }}
      />
      {imageFailed && (
        <p className="error-text" role="status">
          No pudimos mostrar esta imagen. Si es HEIC, puede que necesites
          exportarla como JPG. Al guardar comprobaremos si se puede abrir.
        </p>
      )}
      <Field
        label="Fotografía de perfil"
        hint="Elige una foto y pulsa Guardar. JPG, PNG o WebP; hasta 30 MB. Se ajustará antes de subirla. Sube solo imágenes tuyas o con permiso."
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          disabled={disabled}
          onChange={(event) => {
            onChange(event.target.files?.[0] || null);
            event.target.value = "";
          }}
        />
      </Field>
      {value && (
        <p className="profile-photo-selection" role="status">
          Seleccionada: {value.name}. Aún no está guardada.
        </p>
      )}
    </div>
  );
}

export function ProfilePhotoEditor({
  currentPhoto,
  hasPhoto,
  onSave,
  onDone,
}: {
  currentPhoto: string;
  hasPhoto: boolean;
  onSave: (file: File | null) => Promise<void>;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  async function save() {
    if (saving.current || (!file && !remove)) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const prepared = file ? await prepareProfileImage(file) : null;
      await onSave(prepared);
      onDone();
    } catch (error) {
      setError(profileImageError(error));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="form"
      aria-busy={busy}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <p className="form-intro">
        Cambia tu foto sin modificar los demás datos de tu perfil.
      </p>
      <ProfilePhotoPicker
        currentPhoto={remove ? "" : currentPhoto}
        value={file}
        disabled={busy}
        onChange={(value) => {
          setFile(value);
          setRemove(false);
          setError("");
        }}
      />
      {hasPhoto && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={remove}
            disabled={busy}
            onChange={(event) => {
              setRemove(event.target.checked);
              setFile(null);
              setError("");
            }}
          />
          Quitar mi foto de perfil
        </label>
      )}
      {remove && (
        <p role="status">
          Tu perfil usará el avatar predeterminado cuando guardes.
        </p>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className="button-row">
        <Button disabled={busy || (!file && !remove)}>
          {busy ? "Preparando y guardando…" : "Guardar foto"}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
