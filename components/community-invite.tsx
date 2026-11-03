"use client";
import { useEffect, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { Button } from "./ui";

export function CommunityInvite() {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setUrl(new URL("/", location.origin).href);
    setCanShare(typeof navigator.share === "function");
  }, []);
  return (
    <div className="community-invite">
      <Button
        variant="outline"
        disabled={!url}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setMessage(
              "Enlace de Fairway copiado. Compártelo con quien quieras invitar.",
            );
          } catch {
            setFallback(true);
            setMessage("Selecciona y copia el enlace para invitar a un amigo.");
          }
        }}
      >
        <Copy size={16} />
        Invitar a un amigo
      </Button>
      {canShare && (
        <Button
          variant="ghost"
          disabled={!url}
          onClick={async () => {
            try {
              await navigator.share({
                title: "Juguemos una ronda",
                text: "Encuentra con quién jugar en Fairway.",
                url,
              });
            } catch (e) {
              if ((e as Error).name !== "AbortError") {
                setFallback(true);
                setMessage("Copia el enlace para compartirlo.");
              }
            }
          }}
        >
          <Share2 size={16} />
          Compartir Fairway
        </Button>
      )}
      {fallback && (
        <label className="field">
          <span>Enlace para invitar</span>
          <input readOnly value={url} onFocus={(e) => e.target.select()} />
        </label>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
