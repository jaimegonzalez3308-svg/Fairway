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
  illustration,
}: {
  hasProfiles: boolean;
  exhausted: boolean;
  onReset: () => void;
  onCreate: () => void;
  onShareProfile?: () => void;
  illustration?: React.ReactNode;
}) {
  return (
    <Empty
      icon={illustration}
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

/** iOS app: three fanned crops of the course photo, like a stack of
 * scorecard snapshots. Decorative only. */
export function PhotoStack() {
  return (
    <span className="native-photo-stack" aria-hidden="true">
      {["left", "right", "center"].map((crop) => (
        <img
          key={crop}
          src="/images/fairway-aerial-640.webp"
          alt=""
          width={120}
          height={156}
          loading="lazy"
          decoding="async"
          data-crop={crop}
        />
      ))}
    </span>
  );
}
