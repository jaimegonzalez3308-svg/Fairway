"use client";
import { useEffect, useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { Button, Modal } from "./ui";
import { profileShareUrl } from "@/lib/profile-share";
import type { Profile } from "@/lib/domain";
export function ProfileQR({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(""),
    [qr, setQr] = useState(""),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false),
    [canShare, setCanShare] = useState(false);
  useEffect(() => {
    let current = true;
    setCanShare(typeof navigator.share === "function");
    try {
      const link = profileShareUrl(window.location.origin, profile.id);
      setUrl(link);
      void import("qrcode")
        .then((QRCode) =>
          QRCode.toDataURL(link, {
            width: 600,
            margin: 4,
            errorCorrectionLevel: "M",
            color: { dark: "#173b2aff", light: "#ffffffff" },
          }),
        )
        .then((value) => {
          if (current) setQr(value);
        })
        .catch(() => {
          if (current)
            setError(
              "No pudimos generar el QR. Puedes copiar el enlace de tu perfil.",
            );
        });
    } catch {
      setError("El QR estará disponible cuando tengas una cuenta real.");
    }
    return () => {
      current = false;
    };
  }, [profile.id]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Selecciona y copia el enlace de abajo para compartirlo.");
    }
  }
  return (
    <Modal title="Mi código QR" onClose={onClose} soft>
      <div className="profile-qr">
        <span className="eyebrow">COMPARTAMOS EL FAIRWAY</span>
        <h3>{profile.name}</h3>
        <p>
          Muéstralo en el club o compártelo para que encuentren tu perfil
          fácilmente.
        </p>
        <div className="profile-qr-code">
          {qr ? (
            <img
              src={qr}
              alt={"Código QR para abrir el perfil de " + profile.name}
              width={300}
              height={300}
            />
          ) : !error ? (
            <span role="status">Generando tu QR…</span>
          ) : null}
        </div>
        <p className="muted">
          Quien lo escanee deberá iniciar sesión. Se respeta la visibilidad de
          tu perfil.
        </p>
        {profile.visibility === "private" && (
          <div className="notice">
            Tu perfil es privado. Puedes compartir el enlace, pero otras
            personas no podrán verlo hasta que cambies su visibilidad en Editar
            perfil.
          </div>
        )}
        {url && (
          <>
            <label className="field">
              <span>Enlace de tu perfil</span>
              <input readOnly value={url} onFocus={(e) => e.target.select()} />
            </label>
            <div className="qr-actions">
              <Button onClick={() => void copy()}>
                {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
                {copied ? "Enlace copiado" : "Copiar enlace"}
              </Button>
              {qr && (
                <a
                  className="button outline"
                  href={qr}
                  download="mi-perfil-fairway.png"
                >
                  <Download size={16} />
                  Descargar QR
                </a>
              )}
              {canShare && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.share({
                        title: "Mi perfil de Fairway",
                        text: "Encuéntrame en Fairway",
                        url,
                      });
                    } catch (e) {
                      if ((e as Error).name !== "AbortError")
                        setError("Usa Copiar enlace para compartir tu perfil.");
                    }
                  }}
                >
                  <Share2 size={16} />
                  Compartir
                </Button>
              )}
            </div>
          </>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
