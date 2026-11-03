"use client";
import { Flag, QrCode } from "lucide-react";
import { Button, Empty } from "./ui";
import { CommunityInvite } from "./community-invite";

export function DiscoveryEmpty({
  hasProfiles,
  exhausted,
  onReset,
  onCreate,
  onShareProfile,
}: {
  hasProfiles: boolean;
  exhausted: boolean;
  onReset: () => void;
  onCreate: () => void;
  onShareProfile?: () => void;
}) {
  return (
    <Empty
      title={
        !hasProfiles
          ? "Tu comunidad empieza con una invitación"
          : exhausted
            ? "Ya conociste a los golfistas disponibles"
            : "No encontramos golfistas con esta búsqueda"
      }
      description={
        !hasProfiles
          ? "Invita a alguien con quien te gustaría jugar o publica la primera ronda de tu grupo."
          : exhausted
            ? "Puedes crear una partida para reunir al grupo o invitar a más amigos a Fairway."
            : "Amplía la búsqueda a todas las ciudades o propón tu propia ronda."
      }
      action={
        <div className="empty-actions">
          {hasProfiles && !exhausted && (
            <Button variant="outline" onClick={onReset}>
              Ampliar búsqueda
            </Button>
          )}
          <Button onClick={onCreate}>
            <Flag size={16} />
            Crear una partida
          </Button>
          <CommunityInvite />
          {onShareProfile && (
            <Button variant="ghost" onClick={onShareProfile}>
              <QrCode size={16} />
              Compartir mi perfil
            </Button>
          )}
        </div>
      }
    />
  );
}
