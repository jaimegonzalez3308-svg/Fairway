"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  ImagePlus,
  LoaderCircle,
  PenLine,
  Send,
  SmilePlus,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { FairwayData } from "@/lib/use-fairway";
import {
  STORY_TEXT_LIMIT,
  overlayCaption,
  prepareStoryPhoto,
} from "@/lib/stories";
import { publishStoryPhoto } from "@/lib/story-publish";
import {
  STORY_COLORS,
  STORY_FILTERS,
  STORY_FONTS,
  STORY_STICKERS,
  TEXT_LINE,
  TEXT_PAD,
  clampScale,
  cssFilter,
  displayText,
  drawStrokes,
  fontOf,
  inside,
  pinchChange,
  renderStory,
  textColors,
  type StoryItem,
  type StoryStroke,
  type TextAlign,
  type TextBackground,
} from "@/lib/story-editor";

type Mode = "none" | "pen" | "stickers" | "filters";
type Point = [number, number];

const BACKGROUNDS: { id: TextBackground; label: string }[] = [
  { id: "none", label: "Sin fondo" },
  { id: "solid", label: "Fondo sólido" },
  { id: "soft", label: "Fondo suave" },
];
const ALIGNS: { id: TextAlign; label: string; icon: typeof AlignLeft }[] = [
  { id: "left", label: "Alinear a la izquierda", icon: AlignLeft },
  { id: "center", label: "Centrar", icon: AlignCenter },
  { id: "right", label: "Alinear a la derecha", icon: AlignRight },
];
const COLOR_NAMES: Record<string, string> = {
  "#fffbf2": "Crema",
  "#16241c": "Negro",
  "#193d2f": "Verde bosque",
  "#c7a66a": "Dorado",
  "#ead06f": "Amarillo",
  "#d9e9a4": "Lima",
  "#174bcc": "Azul",
  "#d6453d": "Rojo",
  "#f2a7c3": "Rosa",
};

/** Website story editor: the chosen photo fills the screen and text,
 * stickers, drawing and a filter are layered on top, then flattened into
 * one image that is published through the existing story backend. */
export function StoryEditor({
  photo: initialPhoto,
  data,
  available,
  statusMessage,
  onClose,
  onPublished,
}: {
  photo: Blob;
  data: FairwayData;
  available: boolean;
  statusMessage: string;
  onClose: () => void;
  onPublished: () => Promise<void>;
}) {
  const [photo, setPhoto] = useState(initialPhoto);
  const [src, setSrc] = useState("");
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [items, setItems] = useState<StoryItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("none");
  const [strokes, setStrokes] = useState<StoryStroke[]>([]);
  const [penColor, setPenColor] = useState(STORY_COLORS[4]);
  const [penWidth, setPenWidth] = useState(0.012);
  const [filterId, setFilterId] = useState("original");
  const [audience, setAudience] = useState<"members" | "friends">("members");
  const [dragging, setDragging] = useState(false);
  const [overTrash, setOverTrash] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [replacing, setReplacing] = useState(false);
  const replaceVersion = useRef(0);
  const areaRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const penRef = useRef<HTMLCanvasElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const liveStroke = useRef<StoryStroke | null>(null);
  const gesture = useRef<{
    id: string;
    start: StoryItem;
    pointers: Map<number, Point>;
    from: Map<number, Point>;
    moved: boolean;
  } | null>(null);
  const filter = STORY_FILTERS.find((f) => f.id === filterId)!;
  const editingItem = items.find((i) => i.id === editing);

  useEffect(() => {
    const url = URL.createObjectURL(photo);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // Fit the photo inside the available area, keeping its proportions.
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area || !natural) return;
    const fit = () => {
      const box = area.getBoundingClientRect();
      const ratio = natural.w / natural.h;
      let w = box.width;
      let h = w / ratio;
      if (h > box.height) {
        h = box.height;
        w = h * ratio;
      }
      setStage({ w: Math.floor(w), h: Math.floor(h) });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    return () => observer.disconnect();
  }, [natural]);

  // Redraw the pen layer at screen resolution.
  const paint = () => {
    const canvas = penRef.current;
    if (!canvas || !stage.w) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(stage.w * ratio);
    canvas.height = Math.round(stage.h * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStrokes(
      ctx,
      liveStroke.current ? [...strokes, liveStroke.current] : strokes,
      canvas.width,
      canvas.height,
    );
  };
  useEffect(paint);

  const update = (id: string, change: Partial<StoryItem>) =>
    setItems((list) =>
      list.map((i) => (i.id === id ? { ...i, ...change } : i)),
    );
  const remove = (id: string) => {
    setItems((list) => list.filter((i) => i.id !== id));
    setSelected((s) => (s === id ? null : s));
    setEditing((s) => (s === id ? null : s));
  };
  const finishEditing = () => {
    if (editingItem && !editingItem.text.trim()) remove(editingItem.id);
    setEditing(null);
  };
  const addText = () => {
    finishEditing();
    setMode("none");
    const item: StoryItem = {
      id: crypto.randomUUID(),
      kind: "text",
      text: "",
      font: "clasica",
      color: STORY_COLORS[0],
      background: "none",
      align: "center",
      size: 0.075,
      x: 0.5,
      y: 0.45,
      rotation: 0,
      scale: 1,
    };
    setItems((list) => [...list, item]);
    setSelected(item.id);
    setEditing(item.id);
  };
  const addSticker = (emoji: string) => {
    const item: StoryItem = {
      id: crypto.randomUUID(),
      kind: "sticker",
      text: emoji,
      font: "clasica",
      color: STORY_COLORS[0],
      background: "none",
      align: "center",
      size: 0.16,
      x: 0.5 + (Math.random() - 0.5) * 0.2,
      y: 0.4 + (Math.random() - 0.5) * 0.2,
      rotation: (Math.random() - 0.5) * 0.4,
      scale: 1,
    };
    setItems((list) => [...list, item]);
    setSelected(item.id);
    setMode("none");
  };

  // Item gestures: one finger or the mouse moves; two fingers pinch to
  // resize and twist to rotate. Dropping on the bin deletes the item.
  const onItemDown = (event: React.PointerEvent, item: StoryItem) => {
    if (mode === "pen" || editing) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point: Point = [event.clientX, event.clientY];
    if (!gesture.current || gesture.current.id !== item.id)
      gesture.current = {
        id: item.id,
        start: item,
        pointers: new Map(),
        from: new Map(),
        moved: false,
      };
    const g = gesture.current;
    g.start = items.find((i) => i.id === item.id) || item;
    g.pointers.set(event.pointerId, point);
    g.from = new Map(g.pointers);
    setSelected(item.id);
  };
  const onItemMove = (event: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || !g.pointers.has(event.pointerId) || !stage.w) return;
    g.pointers.set(event.pointerId, [event.clientX, event.clientY]);
    const ids = [...g.from.keys()].filter((id) => g.pointers.has(id));
    const now = ids.map((id) => g.pointers.get(id)!);
    const was = ids.map((id) => g.from.get(id)!);
    const mid = (p: Point[]) =>
      p.reduce<Point>(
        (a, b) => [a[0] + b[0] / p.length, a[1] + b[1] / p.length],
        [0, 0],
      );
    const [mx, my] = mid(now);
    const [sx, sy] = mid(was);
    if (!g.moved && Math.hypot(mx - sx, my - sy) < 4 && ids.length < 2) return;
    if (!g.moved) {
      g.moved = true;
      setDragging(true);
    }
    const change: Partial<StoryItem> = {
      x: Math.min(1, Math.max(0, g.start.x + (mx - sx) / stage.w)),
      y: Math.min(1, Math.max(0, g.start.y + (my - sy) / stage.h)),
    };
    if (ids.length >= 2) {
      const pinch = pinchChange(
        [was[0], was[1]] as [Point, Point],
        [now[0], now[1]] as [Point, Point],
      );
      change.scale = clampScale(g.start.scale * pinch.scale);
      change.rotation = g.start.rotation + pinch.rotation;
    }
    update(g.id, change);
    setOverTrash(
      ids.length < 2 &&
        inside(
          { x: event.clientX, y: event.clientY },
          trashRef.current?.getBoundingClientRect() || null,
        ),
    );
  };
  const onItemUp = (event: React.PointerEvent, item: StoryItem) => {
    const g = gesture.current;
    if (!g) return;
    g.pointers.delete(event.pointerId);
    if (g.pointers.size) {
      // One finger lifted from a pinch: continue from the remaining finger.
      g.start = items.find((i) => i.id === g.id) || g.start;
      g.from = new Map(g.pointers);
      return;
    }
    const dropped = inside(
      { x: event.clientX, y: event.clientY },
      trashRef.current?.getBoundingClientRect() || null,
    );
    const wasMoved = g.moved;
    gesture.current = null;
    setDragging(false);
    setOverTrash(false);
    if (wasMoved && dropped) remove(item.id);
    else if (!wasMoved && item.kind === "text") {
      setEditing(item.id);
      setMode("none");
    }
  };

  // Mouse users resize and rotate with the corner handle.
  const onHandleDown = (event: React.PointerEvent, item: StoryItem) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return;
    const cx = box.left + item.x * box.width;
    const cy = box.top + item.y * box.height;
    const startDist = Math.hypot(event.clientX - cx, event.clientY - cy) || 1;
    const startAngle = Math.atan2(event.clientY - cy, event.clientX - cx);
    const target = event.currentTarget as HTMLElement;
    const move = (e: PointerEvent) =>
      update(item.id, {
        scale: clampScale(
          (item.scale * Math.hypot(e.clientX - cx, e.clientY - cy)) / startDist,
        ),
        rotation:
          item.rotation +
          Math.atan2(e.clientY - cy, e.clientX - cx) -
          startAngle,
      });
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  const onItemKey = (event: React.KeyboardEvent, item: StoryItem) => {
    const step = event.shiftKey ? 0.05 : 0.01;
    const actions: Record<string, () => void> = {
      Enter: () => item.kind === "text" && setEditing(item.id),
      Delete: () => remove(item.id),
      Backspace: () => remove(item.id),
      ArrowLeft: () => update(item.id, { x: Math.max(0, item.x - step) }),
      ArrowRight: () => update(item.id, { x: Math.min(1, item.x + step) }),
      ArrowUp: () => update(item.id, { y: Math.max(0, item.y - step) }),
      ArrowDown: () => update(item.id, { y: Math.min(1, item.y + step) }),
      "+": () => update(item.id, { scale: clampScale(item.scale * 1.1) }),
      "-": () => update(item.id, { scale: clampScale(item.scale / 1.1) }),
      "[": () => update(item.id, { rotation: item.rotation - 0.1 }),
      "]": () => update(item.id, { rotation: item.rotation + 0.1 }),
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  // Pen: draw on the photo with the chosen colour and width.
  const toPoint = (event: React.PointerEvent): Point => {
    const box = stageRef.current!.getBoundingClientRect();
    return [
      (event.clientX - box.left) / box.width,
      (event.clientY - box.top) / box.height,
    ];
  };
  const onPenDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    liveStroke.current = {
      color: penColor,
      width: penWidth,
      points: [toPoint(event)],
    };
    paint();
  };
  const onPenMove = (event: React.PointerEvent) => {
    if (!liveStroke.current) return;
    liveStroke.current.points.push(toPoint(event));
    paint();
  };
  const onPenUp = () => {
    const stroke = liveStroke.current;
    liveStroke.current = null;
    if (stroke) setStrokes((list) => [...list, stroke]);
  };

  async function share() {
    if (busy || replacing || !imageRef.current || !natural) return;
    finishEditing();
    // The typed text travels as the caption too, so the server moderates it
    // and screen readers can read it.
    const caption = overlayCaption(
      items.filter((i) => i.kind === "text").map((i) => i.text),
    );
    if (caption.length > STORY_TEXT_LIMIT + 1) {
      setError(
        `Tu texto es demasiado largo: usa hasta ${STORY_TEXT_LIMIT} caracteres en total.`,
      );
      return;
    }
    if (!available || !supabase || !data.user) {
      setError(statusMessage || "Las historias no están disponibles ahora.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const blob = await renderStory({
        image: imageRef.current,
        filter: filter.ops,
        strokes,
        items: items.filter((i) => i.text.trim()),
      });
      const result = await publishStoryPhoto({
        client: supabase,
        userId: data.user.id,
        photo: blob,
        caption,
        audience,
      });
      if (!result.ok) throw new Error(result.message);
      data.notify("Historia publicada. Estará disponible durante 24 horas.");
      await onPublished();
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "No pudimos publicar. Inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function replace(file?: File) {
    if (!file || busy) return;
    const version = ++replaceVersion.current;
    setReplacing(true);
    try {
      const prepared = await prepareStoryPhoto(file);
      if (version !== replaceVersion.current) return;
      setNatural(null);
      setPhoto(prepared);
    } catch (e) {
      if (version === replaceVersion.current)
        setError(e instanceof Error ? e.message : "No pudimos leer esta foto.");
    } finally {
      if (version === replaceVersion.current) setReplacing(false);
    }
  }

  const fontPx = (item: StoryItem) => item.size * stage.w;

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) setConfirmDiscard(true);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="story-editor-overlay" />
        <Dialog.Content
          className="story-editor"
          aria-describedby="story-editor-help"
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            if (editing) finishEditing();
            else if (mode !== "none") setMode("none");
            else if (!busy) setConfirmDiscard(!confirmDiscard);
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title className="sr-only">Crea tu historia</Dialog.Title>
          <p id="story-editor-help" className="sr-only">
            Agrega texto, stickers, dibujos o un filtro. Selecciona un elemento
            y usa las flechas para moverlo, más y menos para el tamaño,
            corchetes para girarlo y Suprimir para borrarlo.
          </p>
          <header className="story-editor-top" inert={busy}>
            <button
              type="button"
              className="story-editor-round"
              aria-label="Descartar historia"
              disabled={busy}
              onClick={() => setConfirmDiscard(true)}
            >
              <X size={22} />
            </button>
            <div
              className="story-editor-tools"
              role="toolbar"
              aria-label="Herramientas"
            >
              <button
                type="button"
                className="story-editor-round"
                aria-label="Agregar texto"
                onClick={addText}
              >
                <span className="story-editor-aa" aria-hidden="true">
                  Aa
                </span>
              </button>
              <button
                type="button"
                className="story-editor-round"
                aria-label="Stickers"
                aria-pressed={mode === "stickers"}
                onClick={() => {
                  finishEditing();
                  setMode(mode === "stickers" ? "none" : "stickers");
                }}
              >
                <SmilePlus size={21} />
              </button>
              <button
                type="button"
                className="story-editor-round"
                aria-label="Dibujar"
                aria-pressed={mode === "pen"}
                onClick={() => {
                  finishEditing();
                  setSelected(null);
                  setMode(mode === "pen" ? "none" : "pen");
                }}
              >
                <PenLine size={21} />
              </button>
              <button
                type="button"
                className="story-editor-round"
                aria-label="Filtros"
                aria-pressed={mode === "filters"}
                onClick={() => {
                  finishEditing();
                  setMode(mode === "filters" ? "none" : "filters");
                }}
              >
                <Sparkles size={21} />
              </button>
              <button
                type="button"
                className="story-editor-round"
                aria-label="Cambiar foto"
                onClick={() => replaceRef.current?.click()}
              >
                <ImagePlus size={21} />
              </button>
              <input
                ref={replaceRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  void replace(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </header>

          <div className="story-editor-area" ref={areaRef} inert={busy}>
            <div
              className="story-editor-stage"
              ref={stageRef}
              style={{
                width: stage.w || undefined,
                height: stage.h || undefined,
              }}
              onPointerDown={() => {
                if (mode === "none" && !editing) setSelected(null);
              }}
            >
              {src && (
                <img
                  ref={imageRef}
                  src={src}
                  alt="Tu foto"
                  draggable={false}
                  style={{ filter: cssFilter(filter.ops) }}
                  onLoad={(e) =>
                    setNatural({
                      w: e.currentTarget.naturalWidth,
                      h: e.currentTarget.naturalHeight,
                    })
                  }
                />
              )}
              <canvas
                ref={penRef}
                className="story-editor-pen"
                aria-hidden="true"
              />
              {mode === "pen" && (
                <div
                  className="story-editor-pen-capture"
                  aria-label="Área de dibujo"
                  onPointerDown={onPenDown}
                  onPointerMove={onPenMove}
                  onPointerUp={onPenUp}
                  onPointerCancel={onPenUp}
                />
              )}
              {stage.w > 0 &&
                items.map((item) => {
                  const colors = textColors(item);
                  const font = fontOf(item.font);
                  const isEditing = editing === item.id;
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      aria-label={
                        item.kind === "text"
                          ? `Texto: ${item.text || "vacío"}. Enter para editar`
                          : `Sticker ${item.text}`
                      }
                      className={`story-editor-item ${item.kind} ${colors.box ? "boxed" : ""} ${selected === item.id ? "selected" : ""}`}
                      style={{
                        left: `${item.x * 100}%`,
                        top: `${item.y * 100}%`,
                        transform: `translate(-50%, -50%) rotate(${item.rotation}rad) scale(${item.scale})`,
                        fontSize: fontPx(item),
                        fontFamily: font.family,
                        fontWeight: font.weight,
                        fontStyle: font.style,
                        textAlign: item.align,
                        lineHeight: TEXT_LINE,
                        padding: item.kind === "text" ? `${TEXT_PAD}em` : 0,
                        color: colors.text,
                        background: colors.box || "transparent",
                        visibility: isEditing ? "hidden" : undefined,
                        opacity:
                          dragging &&
                          overTrash &&
                          gesture.current?.id === item.id
                            ? 0.45
                            : undefined,
                      }}
                      onPointerDown={(e) => onItemDown(e, item)}
                      onPointerMove={onItemMove}
                      onPointerUp={(e) => onItemUp(e, item)}
                      onPointerCancel={(e) => onItemUp(e, item)}
                      onFocus={() => setSelected(item.id)}
                      onKeyDown={(e) => onItemKey(e, item)}
                    >
                      {displayText(item) || " "}
                      {selected === item.id && !dragging && mode !== "pen" && (
                        <span
                          className="story-editor-handle"
                          aria-hidden="true"
                          onPointerDown={(e) => onHandleDown(e, item)}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
            {!natural && (
              <LoaderCircle
                className="story-spinner story-editor-loading"
                size={30}
              />
            )}
          </div>

          {editingItem && (
            <div
              className="story-editor-textmode"
              inert={busy}
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) finishEditing();
              }}
            >
              <div
                className="story-editor-textbar"
                role="toolbar"
                aria-label="Estilo del texto"
              >
                <div className="story-editor-fonts">
                  {STORY_FONTS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={editingItem.font === f.id}
                      style={{
                        fontFamily: f.family,
                        fontStyle: f.style,
                        fontWeight: f.weight,
                      }}
                      onClick={() => update(editingItem.id, { font: f.id })}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="story-editor-row">
                  <button
                    type="button"
                    className="story-editor-round small"
                    aria-label={`${BACKGROUNDS.find((b) => b.id === editingItem.background)!.label}. Cambiar fondo`}
                    onClick={() => {
                      const i = BACKGROUNDS.findIndex(
                        (b) => b.id === editingItem.background,
                      );
                      update(editingItem.id, {
                        background:
                          BACKGROUNDS[(i + 1) % BACKGROUNDS.length].id,
                      });
                    }}
                  >
                    <span
                      className={`story-editor-bg-icon ${editingItem.background}`}
                    >
                      A
                    </span>
                  </button>
                  {(() => {
                    const i = ALIGNS.findIndex(
                      (a) => a.id === editingItem.align,
                    );
                    const Icon = ALIGNS[i].icon;
                    return (
                      <button
                        type="button"
                        className="story-editor-round small"
                        aria-label={`${ALIGNS[i].label}. Cambiar alineación`}
                        onClick={() =>
                          update(editingItem.id, {
                            align: ALIGNS[(i + 1) % ALIGNS.length].id,
                          })
                        }
                      >
                        <Icon size={19} />
                      </button>
                    );
                  })()}
                  <label className="story-editor-size">
                    <span className="sr-only">Tamaño del texto</span>
                    <input
                      type="range"
                      min={0.035}
                      max={0.16}
                      step={0.005}
                      value={editingItem.size}
                      onChange={(e) =>
                        update(editingItem.id, { size: Number(e.target.value) })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="story-editor-done"
                    onClick={finishEditing}
                  >
                    <Check size={17} />
                    Listo
                  </button>
                </div>
                <ColorRow
                  value={editingItem.color}
                  onChange={(color) => update(editingItem.id, { color })}
                />
              </div>
              <textarea
                autoFocus
                aria-label="Texto de la historia"
                className="story-editor-input"
                value={editingItem.text}
                maxLength={180}
                rows={Math.max(1, editingItem.text.split("\n").length)}
                placeholder="Escribe algo…"
                onChange={(e) =>
                  update(editingItem.id, { text: e.target.value })
                }
                style={{
                  fontSize: Math.min(fontPx(editingItem) * 1.1, 52),
                  fontFamily: fontOf(editingItem.font).family,
                  fontWeight: fontOf(editingItem.font).weight,
                  fontStyle: fontOf(editingItem.font).style,
                  textTransform: fontOf(editingItem.font).upper
                    ? "uppercase"
                    : undefined,
                  textAlign: editingItem.align,
                  color: textColors(editingItem).text,
                  background: textColors(editingItem).box || "transparent",
                }}
              />
            </div>
          )}

          <footer className="story-editor-bottom">
            {dragging ? (
              <div
                ref={trashRef}
                className={`story-editor-trash ${overTrash ? "active" : ""}`}
                aria-hidden="true"
              >
                <Trash2 size={24} />
              </div>
            ) : mode === "pen" ? (
              <div className="story-editor-panel">
                <ColorRow value={penColor} onChange={setPenColor} />
                <div className="story-editor-row">
                  <label className="story-editor-size">
                    <span className="sr-only">Grosor del trazo</span>
                    <input
                      type="range"
                      min={0.004}
                      max={0.04}
                      step={0.002}
                      value={penWidth}
                      onChange={(e) => setPenWidth(Number(e.target.value))}
                    />
                  </label>
                  <button
                    type="button"
                    className="story-editor-round small"
                    aria-label="Deshacer trazo"
                    disabled={!strokes.length}
                    onClick={() => setStrokes((list) => list.slice(0, -1))}
                  >
                    <Undo2 size={19} />
                  </button>
                  <button
                    type="button"
                    className="story-editor-done"
                    onClick={() => setMode("none")}
                  >
                    <Check size={17} />
                    Listo
                  </button>
                </div>
              </div>
            ) : mode === "stickers" ? (
              <div className="story-editor-panel">
                <div className="story-editor-stickers">
                  {STORY_STICKERS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={`Agregar sticker ${emoji}`}
                      onClick={() => addSticker(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ) : mode === "filters" ? (
              <div className="story-editor-panel">
                <div className="story-editor-filters">
                  {STORY_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={filterId === f.id}
                      onClick={() => setFilterId(f.id)}
                    >
                      {src && (
                        <img
                          src={src}
                          alt=""
                          style={{ filter: cssFilter(f.ops) }}
                        />
                      )}
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="story-editor-share">
                <label className="story-editor-audience">
                  <span className="sr-only">¿Quién puede verla?</span>
                  <select
                    value={audience}
                    disabled={busy || replacing}
                    onChange={(e) =>
                      setAudience(e.target.value as "members" | "friends")
                    }
                  >
                    <option value="members">Miembros de Fairway</option>
                    <option value="friends">Solo amigos</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="story-editor-publish"
                  disabled={busy || replacing || !natural}
                  onClick={() => void share()}
                >
                  {busy ? (
                    <LoaderCircle size={18} className="story-spinner" />
                  ) : (
                    <Send size={18} />
                  )}
                  {busy ? "Publicando…" : "Compartir historia"}
                </button>
              </div>
            )}
            {error && (
              <p className="story-editor-error" role="alert">
                {error}
              </p>
            )}
          </footer>

          {/* A nested modal keeps focus inside the confirmation. */}
          <Dialog.Root open={confirmDiscard} onOpenChange={setConfirmDiscard}>
            <Dialog.Portal>
              <Dialog.Overlay className="story-editor-confirm-backdrop" />
              <Dialog.Content
                className="story-editor-confirm"
                role="alertdialog"
                aria-describedby="story-discard-text"
              >
                <Dialog.Title id="story-discard-title">
                  ¿Descartar esta historia?
                </Dialog.Title>
                <p id="story-discard-text">
                  Se perderán la foto y todo lo que agregaste.
                </p>
                <button
                  type="button"
                  className="story-editor-discard"
                  autoFocus
                  onClick={onClose}
                >
                  Descartar
                </button>
                <button type="button" onClick={() => setConfirmDiscard(false)}>
                  Seguir editando
                </button>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ColorRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="story-editor-colors" role="radiogroup" aria-label="Color">
      {STORY_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={COLOR_NAMES[color] || color}
          style={{ background: color }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}
