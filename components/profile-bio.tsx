"use client";
import { useId } from "react";
import { Pencil } from "lucide-react";
import { Button } from "./ui";

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
        <h3 id={heading}>Descripción</h3>
        {onEdit && (
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil size={15} aria-hidden="true" />
            {hasBio ? "Editar descripción" : "Añadir descripción"}
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
