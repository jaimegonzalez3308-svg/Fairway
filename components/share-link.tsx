"use client";
import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "./ui";
import { gameShareUrl } from "@/lib/game-share";
import { canSharePublicLink, sharePublicLink } from "@/lib/share-public-link";

export function GameShareLink({ id }: { id: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCopied(false);
    setError("");
    try {
      setUrl(gameShareUrl(location.origin, id));
    } catch {
      setUrl("");
    }
    setCanShare(canSharePublicLink());
  }, [id]);
  if (!url) return null;
  return (
    <section className="share-round" aria-label="Compartir partida">
      <p>
        Comparte el plan. Quien abra el enlace deberá iniciar sesión y tener
        permiso para verlo; no reserva un lugar ni da acceso al club.
      </p>
      <label className="field">
        <span>Enlace de la partida</span>
        <input readOnly value={url} onFocus={(e) => e.target.select()} />
      </label>
      <div className="button-row">
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setError("");
            } catch {
              setError(
                "Selecciona y copia el enlace de arriba para compartirlo.",
              );
            }
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Enlace copiado" : "Copiar enlace de la partida"}
        </Button>
        {canShare && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await sharePublicLink({ title: "Una ronda en Fairway", url });
              } catch (e) {
                if ((e as Error).name !== "AbortError")
                  setError("Usa Copiar enlace para compartir la partida.");
              }
            }}
          >
            <Share2 size={16} />
            Compartir
          </Button>
        )}
      </div>
      <span role="status">{copied ? "Enlace copiado." : ""}</span>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
    </section>
  );
}
