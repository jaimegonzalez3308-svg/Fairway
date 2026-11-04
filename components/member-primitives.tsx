"use client";
import type { Profile } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function Avatar({
  profile,
  large = false,
}: {
  profile: Profile;
  large?: boolean;
}) {
  return (
    <span className={cn("avatar", large && "large")}>
      {profile.photo ? <img src={profile.photo} alt="" /> : profile.name[0]}
    </span>
  );
}
export function InfoItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className ? `info-item ${className}` : "info-item"}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
export function statusLabel(s: string) {
  return (
    {
      open: "Abierta",
      full: "Completa",
      cancelled: "Cancelada",
      finished: "Finalizada",
    }[s] || s
  );
}
