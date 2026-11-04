"use client";
import { useEffect, useState, type CSSProperties } from "react";

export type Rgb = { r: number; g: number; b: number };

/** Colour that represents a photo: an average weighted toward saturated,
 * mid-tone pixels, so grass, sky or a shirt win over white sky and shadow.
 * `data` is RGBA, as returned by canvas getImageData. */
export function tintFromPixels(data: ArrayLike<number>): Rgb | null {
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const [pr, pg, pb] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(pr, pg, pb);
    const min = Math.min(pr, pg, pb);
    const light = (max + min) / 510;
    const sat =
      max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
    // Near-white and near-black pixels barely count; colourful ones count most.
    const weight = (0.08 + sat) * (1 - Math.abs(light - 0.5) * 1.6);
    if (weight <= 0) continue;
    r += pr * weight;
    g += pg * weight;
    b += pb * weight;
    total += weight;
  }
  if (!total) return null;
  return {
    r: Math.round(r / total),
    g: Math.round(g / total),
    b: Math.round(b / total),
  };
}

function toHsl({ r, g, b }: Rgb) {
  const [nr, ng, nb] = [r / 255, g / 255, b / 255];
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === nr
      ? ((ng - nb) / d + (ng < nb ? 6 : 0)) * 60
      : max === ng
        ? ((nb - nr) / d + 2) * 60
        : ((nr - ng) / d + 4) * 60;
  return { h, s, l };
}

/** Readable shades of a photo's colour. Lightness is fixed, never taken
 * from the photo, so text contrast does not depend on the picture:
 * `soft` sits under Fairway's dark ink and `accent` is a mid tone for
 * lines and shadows. Saturation is capped to stay calm. */
export function tintPalette(rgb: Rgb) {
  const { h, s } = toHsl(rgb);
  const hue = Math.round(h);
  const sat = (max: number) => Math.round(Math.min(s, max) * 100);
  return {
    soft: `hsl(${hue} ${sat(0.45)}% 93%)`,
    accent: `hsl(${hue} ${sat(0.55)}% 42%)`,
  };
}

const cache = new Map<string, Promise<Rgb | null>>();

/** Samples a photo on a 24×24 canvas. Uses its own CORS image request so
 * the visible <img> is untouched; any failure simply means "no tint". */
export function loadImageTint(src: string): Promise<Rgb | null> {
  const known = cache.get(src);
  if (known) return known;
  const result = new Promise<Rgb | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 24;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return resolve(null);
        context.drawImage(image, 0, 0, 24, 24);
        resolve(tintFromPixels(context.getImageData(0, 0, 24, 24).data));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
  cache.set(src, result);
  return result;
}

/** iOS app only: CSS variables (--tint-soft, --tint-accent) for a photo. */
export function useImageTint(src: string | null | undefined) {
  const [style, setStyle] = useState<CSSProperties | undefined>();
  useEffect(() => {
    let current = true;
    setStyle(undefined);
    if (
      !src ||
      src.endsWith(".svg") ||
      !document.documentElement.classList.contains("native-ios")
    )
      return;
    void loadImageTint(src).then((rgb) => {
      if (!current || !rgb) return;
      const palette = tintPalette(rgb);
      setStyle({
        "--tint-soft": palette.soft,
        "--tint-accent": palette.accent,
      } as CSSProperties);
    });
    return () => {
      current = false;
    };
  }, [src]);
  return style;
}
