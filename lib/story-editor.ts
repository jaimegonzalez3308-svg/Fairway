/** Pure helpers for the website's story editor: fonts, colours, filters,
 * gestures and the final render that flattens everything into one JPEG.
 * The same numbers drive the on-screen preview and the exported image. */

export type StoryFontId =
  "clasica" | "club" | "marcador" | "maquina" | "fuerte";
export type TextBackground = "none" | "solid" | "soft";
export type TextAlign = "left" | "center" | "right";

export const STORY_FONTS: {
  id: StoryFontId;
  label: string;
  family: string;
  weight: number;
  style: "normal" | "italic";
  upper?: boolean;
}[] = [
  {
    id: "clasica",
    label: "Clásica",
    family: 'Inter, "Segoe UI", Arial, sans-serif',
    weight: 600,
    style: "normal",
  },
  {
    id: "club",
    label: "Club",
    family: 'Georgia, "Times New Roman", serif',
    weight: 400,
    style: "italic",
  },
  {
    id: "marcador",
    label: "Marcador",
    family: '"Marker Felt", "Comic Sans MS", "Chalkboard SE", cursive',
    weight: 700,
    style: "normal",
  },
  {
    id: "maquina",
    label: "Tarjeta",
    family: '"Courier New", Courier, monospace',
    weight: 700,
    style: "normal",
  },
  {
    id: "fuerte",
    label: "Fuerte",
    family: 'Inter, "Arial Black", Arial, sans-serif',
    weight: 800,
    style: "normal",
    upper: true,
  },
];

export const STORY_COLORS = [
  "#fffbf2",
  "#16241c",
  "#193d2f",
  "#c7a66a",
  "#ead06f",
  "#d9e9a4",
  "#174bcc",
  "#d6453d",
  "#f2a7c3",
];

export const STORY_STICKERS = [
  "⛳",
  "🏌️",
  "🏌️‍♀️",
  "🏆",
  "🐦",
  "🦅",
  "🎯",
  "🔥",
  "👏",
  "🙌",
  "💪",
  "😎",
  "😂",
  "❤️",
  "☀️",
  "🌧️",
  "☕",
  "🍺",
  "📍",
  "✨",
];

export type StoryItem = {
  id: string;
  kind: "text" | "sticker";
  text: string;
  font: StoryFontId;
  color: string;
  background: TextBackground;
  align: TextAlign;
  /** Font size as a fraction of the image width. */
  size: number;
  /** Centre of the item, 0–1 across the image. */
  x: number;
  y: number;
  rotation: number;
  scale: number;
};

export type StoryStroke = {
  color: string;
  /** Line width as a fraction of the image width. */
  width: number;
  points: [number, number][];
};

export type FilterOps = {
  grayscale?: number;
  sepia?: number;
  saturate?: number;
  brightness?: number;
  contrast?: number;
};

export const STORY_FILTERS: { id: string; label: string; ops: FilterOps }[] = [
  { id: "original", label: "Original", ops: {} },
  { id: "fairway", label: "Fairway", ops: { saturate: 1.3, contrast: 1.06 } },
  {
    id: "atardecer",
    label: "Atardecer",
    ops: { sepia: 0.3, saturate: 1.3, brightness: 1.04 },
  },
  {
    id: "clubhouse",
    label: "Clubhouse",
    ops: { sepia: 0.2, contrast: 1.1, brightness: 0.95 },
  },
  { id: "bn", label: "B/N", ops: { grayscale: 1, contrast: 1.12 } },
  {
    id: "rocio",
    label: "Rocío",
    ops: { brightness: 1.08, saturate: 0.85, contrast: 0.94 },
  },
];

const FILTER_ORDER = [
  "grayscale",
  "sepia",
  "saturate",
  "brightness",
  "contrast",
] as const;

/** The CSS filter used by the preview; same order as the pixel version. */
export function cssFilter(ops: FilterOps) {
  return (
    FILTER_ORDER.filter((k) => ops[k] !== undefined)
      .map((k) => `${k}(${ops[k]})`)
      .join(" ") || "none"
  );
}

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Applies the filter to RGBA pixels with the W3C filter-effects matrices,
 * so the exported image matches the preview in every browser. */
export function applyFilterPixels(pixels: Uint8ClampedArray, ops: FilterOps) {
  const steps = FILTER_ORDER.filter((k) => ops[k] !== undefined);
  if (!steps.length) return pixels;
  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i];
    let g = pixels[i + 1];
    let b = pixels[i + 2];
    for (const step of steps) {
      const a = ops[step]!;
      if (step === "grayscale" || step === "saturate") {
        const s = step === "grayscale" ? 1 - Math.min(1, a) : a;
        const nr =
          (0.213 + 0.787 * s) * r +
          (0.715 - 0.715 * s) * g +
          (0.072 - 0.072 * s) * b;
        const ng =
          (0.213 - 0.213 * s) * r +
          (0.715 + 0.285 * s) * g +
          (0.072 - 0.072 * s) * b;
        const nb =
          (0.213 - 0.213 * s) * r +
          (0.715 - 0.715 * s) * g +
          (0.072 + 0.928 * s) * b;
        r = nr;
        g = ng;
        b = nb;
      } else if (step === "sepia") {
        const s = 1 - Math.min(1, a);
        const nr =
          (0.393 + 0.607 * s) * r +
          (0.769 - 0.769 * s) * g +
          (0.189 - 0.189 * s) * b;
        const ng =
          (0.349 - 0.349 * s) * r +
          (0.686 + 0.314 * s) * g +
          (0.168 - 0.168 * s) * b;
        const nb =
          (0.272 - 0.272 * s) * r +
          (0.534 - 0.534 * s) * g +
          (0.131 + 0.869 * s) * b;
        r = nr;
        g = ng;
        b = nb;
      } else if (step === "brightness") {
        r *= a;
        g *= a;
        b *= a;
      } else {
        r = (r - 127.5) * a + 127.5;
        g = (g - 127.5) * a + 127.5;
        b = (b - 127.5) * a + 127.5;
      }
      r = clamp(r);
      g = clamp(g);
      b = clamp(b);
    }
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
  }
  return pixels;
}

/** Dark or cream text, whichever reads better on a solid background. */
export function readableOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum =
    (0.2126 * ((n >> 16) & 255) +
      0.7152 * ((n >> 8) & 255) +
      0.0722 * (n & 255)) /
    255;
  return lum > 0.6 ? "#16241c" : "#fffbf2";
}

/** Text and box colours for a text item. */
export function textColors(item: Pick<StoryItem, "color" | "background">) {
  if (item.background === "solid")
    return { text: readableOn(item.color), box: item.color };
  if (item.background === "soft")
    return { text: item.color, box: "rgba(13, 31, 23, 0.55)" };
  return { text: item.color, box: null };
}

export function fontOf(id: StoryFontId) {
  return STORY_FONTS.find((f) => f.id === id) || STORY_FONTS[0];
}

export function displayText(item: Pick<StoryItem, "text" | "font">) {
  return fontOf(item.font).upper ? item.text.toUpperCase() : item.text;
}

/** Scale and rotation between two pairs of touch points. */
export function pinchChange(
  from: [[number, number], [number, number]],
  to: [[number, number], [number, number]],
) {
  const span = (p: [[number, number], [number, number]]) =>
    Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]);
  const angle = (p: [[number, number], [number, number]]) =>
    Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]);
  return {
    scale: span(from) ? span(to) / span(from) : 1,
    rotation: angle(to) - angle(from),
  };
}

export const clampScale = (s: number) => Math.min(6, Math.max(0.3, s));

export function inside(
  point: { x: number; y: number },
  rect: { left: number; top: number; right: number; bottom: number } | null,
) {
  return (
    !!rect &&
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: StoryStroke[],
  width: number,
  height: number,
) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of strokes) {
    if (!stroke.points.length) continue;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = Math.max(1, stroke.width * width);
    ctx.beginPath();
    const [x0, y0] = stroke.points[0];
    ctx.moveTo(x0 * width, y0 * height);
    if (stroke.points.length === 1) ctx.lineTo(x0 * width + 0.01, y0 * height);
    for (const [x, y] of stroke.points.slice(1))
      ctx.lineTo(x * width, y * height);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Line height and padding shared with the preview CSS (em units). */
export const TEXT_LINE = 1.2;
export const TEXT_PAD = 0.3;

export function drawItem(
  ctx: CanvasRenderingContext2D,
  item: StoryItem,
  width: number,
  height: number,
) {
  const font = fontOf(item.font);
  const px = item.size * width;
  const lines = displayText(item).split("\n");
  ctx.save();
  ctx.translate(item.x * width, item.y * height);
  ctx.rotate(item.rotation);
  ctx.scale(item.scale, item.scale);
  ctx.font = `${font.style} ${font.weight} ${px}px ${font.family}`;
  ctx.textBaseline = "middle";
  const widths = lines.map((l) => ctx.measureText(l).width);
  const textWidth = Math.max(...widths, 0);
  const pad = item.kind === "text" ? TEXT_PAD * px : 0;
  const boxW = textWidth + pad * 2;
  const boxH = lines.length * TEXT_LINE * px + pad * 2;
  const colors =
    item.kind === "text" ? textColors(item) : { text: "#000", box: null };
  if (colors.box) {
    ctx.fillStyle = colors.box;
    roundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 0.25 * px);
    ctx.fill();
  }
  ctx.fillStyle = colors.text;
  ctx.textAlign = item.align;
  const x =
    item.align === "left"
      ? -boxW / 2 + pad
      : item.align === "right"
        ? boxW / 2 - pad
        : 0;
  lines.forEach((line, i) => {
    const y = -boxH / 2 + pad + (i + 0.5) * TEXT_LINE * px;
    if (item.kind === "text" && !colors.box) {
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = px * 0.18;
    }
    ctx.fillText(line, x, y);
  });
  ctx.restore();
}

/** Flattens the photo, filter, drawing and text into the final JPEG. */
export async function renderStory({
  image,
  filter,
  strokes,
  items,
}: {
  image: HTMLImageElement;
  filter: FilterOps;
  strokes: StoryStroke[];
  items: StoryItem[];
}) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No pudimos preparar tu historia.");
  ctx.fillStyle = "#16382b";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  if (Object.keys(filter).length) {
    const frame = ctx.getImageData(0, 0, width, height);
    applyFilterPixels(frame.data, filter);
    ctx.putImageData(frame, 0, 0);
  }
  drawStrokes(ctx, strokes, width, height);
  if (typeof document !== "undefined" && document.fonts?.ready)
    await document.fonts.ready;
  for (const item of items) drawItem(ctx, item, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.88),
  );
  if (!blob || blob.size > 5 * 1024 * 1024)
    throw new Error("No pudimos preparar tu historia. Prueba con otra foto.");
  return blob;
}
