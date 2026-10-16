"use client";
import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Heart,
  ImagePlus,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button, Modal } from "./ui";
import { supabase } from "@/lib/supabase";
import type { FairwayData } from "@/lib/use-fairway";
import {
  groupStories,
  prepareStoryPhoto,
  storyTime,
  type Story,
} from "@/lib/stories";
import { useStories } from "@/lib/use-stories";

function PersonAvatar({ photo, name }: { photo?: string; name: string }) {
  return (
    <span className="story-avatar">
      {photo ? <img src={photo} alt="" /> : name.charAt(0).toUpperCase()}
    </span>
  );
}

export function Stories({ data }: { data: FairwayData }) {
  const feed = useStories(data);
  const [composing, setComposing] = useState(false);
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const userId = data.user?.id || "";
  const groups = groupStories(feed.stories, userId);
  const active = feed.stories.find((s) => s.id === playlist[index]);
  const people = [data.me, ...data.profiles];
  function move(direction: number) {
    let next = index + direction;
    while (
      next >= 0 &&
      next < playlist.length &&
      !feed.stories.some((s) => s.id === playlist[next])
    )
      next += direction;
    if (next < 0) return;
    if (next >= playlist.length) setPlaylist([]);
    else setIndex(next);
  }
  return (
    <>
      <section
        className="stories-panel panel"
        aria-label="Historias de la comunidad"
      >
        <div className="stories-heading">
          <div>
            <span className="eyebrow">EL CAMPO, EN VIVO</span>
            <h2>
              Un momento en el green<span>.</span>
            </h2>
          </div>
          <span className="stories-expiry">
            <Clock3 size={14} />
            24 horas
          </span>
        </div>
        <div className="stories-rail">
          <button
            className="story-circle story-create"
            onClick={() => setComposing(true)}
            aria-label="Subir una historia"
          >
            <span className="story-ring">
              <PersonAvatar photo={data.me.photo} name={data.me.name} />
              <span className="story-plus">
                <Plus size={14} />
              </span>
            </span>
            <strong>Crear historia</strong>
            <small>Tu próxima anécdota</small>
          </button>
          {groups.map((group) => {
            const person = people.find((p) => p.id === group.userId);
            const own = group.userId === userId;
            return (
              <button
                key={group.userId}
                className={`story-circle ${group.unseen && !own ? "unseen" : "seen"}`}
                onClick={() => {
                  const ids = groups.flatMap((g) => g.items.map((s) => s.id));
                  const first =
                    group.items.find(
                      (s) => !s.story_views.some((v) => v.user_id === userId),
                    ) || group.items[0];
                  setIndex(ids.indexOf(first.id));
                  setPlaylist(ids);
                }}
                aria-label={`Ver ${own ? "tus historias" : `historias de ${person?.name || "Golfista"}`}${group.unseen && !own ? ", sin ver" : ""}`}
              >
                <span className="story-ring">
                  <PersonAvatar
                    photo={person?.photo}
                    name={person?.name || "Golfista"}
                  />
                  {group.items.length > 1 && (
                    <span className="story-count">{group.items.length}</span>
                  )}
                </span>
                <strong>
                  {own
                    ? "Tu historia"
                    : person?.name.split(" ")[0] || "Golfista"}
                </strong>
                <small>
                  {own
                    ? "Ver actividad"
                    : group.unseen
                      ? "Nueva historia"
                      : "Vista"}
                </small>
              </button>
            );
          })}
          {!groups.length && (
            <div className="stories-invitation">
              <span className="stories-invitation-icon">
                <Camera size={23} strokeWidth={1.5} />
              </span>
              <div>
                <strong>
                  {feed.loading
                    ? "Buscando momentos…"
                    : "Cada ronda tiene una historia."}
                </strong>
                <p>
                  {feed.error ||
                    "Un gran tiro, tu foursome o la vista del hoyo 18. Comparte la tuya."}
                </p>
                {feed.error && (
                  <button
                    className="inline-link"
                    onClick={() => void feed.refresh()}
                  >
                    <RefreshCw size={12} />
                    Reintentar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
      {composing && (
        <StoryComposer
          data={data}
          available={feed.available}
          onClose={() => setComposing(false)}
          onPublished={async () => {
            setComposing(false);
            await feed.refresh();
          }}
        />
      )}
      {!!playlist.length && (
        <StoryViewer
          key={active?.id || "unavailable"}
          story={active}
          data={data}
          siblings={feed.stories.filter((s) => s.user_id === active?.user_id)}
          canPrevious={index > 0}
          onPrevious={() => move(-1)}
          onNext={() => move(1)}
          onClose={() => setPlaylist([])}
          onSeen={feed.markSeen}
          onLiked={feed.setLiked}
          onRefresh={feed.refresh}
        />
      )}
    </>
  );
}

function StoryComposer({
  data,
  available,
  onClose,
  onPublished,
}: {
  data: FairwayData;
  available: boolean;
  onClose: () => void;
  onPublished: () => Promise<void>;
}) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState("members");
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const fileGeneration = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  async function choose(file?: File) {
    if (!file) return;
    const version = ++fileGeneration.current;
    setPreparing(true);
    setError("");
    try {
      const prepared = await prepareStoryPhoto(file);
      if (mounted.current && version === fileGeneration.current)
        setPhoto(prepared);
    } catch (e) {
      if (mounted.current && version === fileGeneration.current) {
        setPhoto(null);
        setPreview("");
        setError(e instanceof Error ? e.message : "No pudimos leer esta foto.");
      }
    } finally {
      if (mounted.current && version === fileGeneration.current)
        setPreparing(false);
    }
  }
  async function publish() {
    if (!photo || !supabase || !data.user || !available || busy) return;
    setBusy(true);
    setError("");
    const id = crypto.randomUUID();
    const path = `${data.user.id}/${id}.jpg`;
    let uploaded = false;
    let published = false;
    try {
      const result = await supabase.storage
        .from("story-images")
        .upload(path, photo, {
          contentType: "image/jpeg",
          cacheControl: "0",
          upsert: false,
        });
      if (result.error) throw result.error;
      uploaded = true;
      const result2 = await supabase.rpc("publish_story", {
        story: id,
        story_caption: caption.trim(),
        story_audience: audience,
      });
      if (result2.error) throw result2.error;
      published = true;
      data.notify("Historia publicada. Estará disponible durante 24 horas.");
      await onPublished();
    } catch (e) {
      // Una respuesta perdida puede llegar después del commit: comprobar antes de borrar la foto.
      if (uploaded && !published) {
        const check = await supabase.from("stories").select("id").eq("id", id);
        if (!check.error && !check.data?.length)
          await supabase.storage.from("story-images").remove([path]);
        if (check.data?.length) {
          data.notify("Historia publicada.");
          await onPublished();
          return;
        }
      }
      setError(
        (e as { message?: string }).message ||
          "No pudimos publicar. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Modal
      title="Tu momento en el campo"
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <div className="story-composer">
        <div className={`story-preview ${preview ? "has-photo" : ""}`}>
          {preview ? (
            <>
              <img src={preview} alt="Vista previa de tu historia" />
              <div className="story-preview-shade" />
              <span className="story-preview-label">
                <Clock3 size={13} />
                VISTA PREVIA · 24 H
              </span>
              {caption && <p className="story-caption">{caption}</p>}
            </>
          ) : (
            <div className="story-preview-empty">
              <Camera size={42} strokeWidth={1} />
              <strong>
                El golf se vive.
                <br />Y se comparte.
              </strong>
              <span>Tu siguiente historia empieza aquí.</span>
            </div>
          )}
        </div>
        <div className="story-composer-fields">
          <span className="eyebrow">SOLO POR HOY</span>
          <h3>Comparte ese momento.</h3>
          <p>Una foto de tu ronda. Una historia que desaparece en 24 horas.</p>
          <label className="story-upload" aria-disabled={busy || preparing}>
            {preparing ? (
              <LoaderCircle size={20} className="story-spinner" />
            ) : (
              <ImagePlus size={20} />
            )}
            <strong>
              {preparing
                ? "Preparando foto…"
                : photo
                  ? "Cambiar fotografía"
                  : "Elegir una fotografía"}
            </strong>
            <span>JPG, PNG o WebP · hasta 10 MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Elegir fotografía para historia"
              disabled={busy || preparing}
              onChange={(e) => {
                void choose(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <label className="field">
            <span>
              Añade unas palabras <small>(opcional)</small>
            </span>
            <textarea
              placeholder="Ese tiro que te hace volver…"
              value={caption}
              maxLength={180}
              rows={3}
              disabled={busy}
              onChange={(e) => setCaption(e.target.value)}
            />
            <small className="story-char-count">{caption.length}/180</small>
          </label>
          <label className="field">
            <span>¿Quién puede verla?</span>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              disabled={busy}
            >
              <option value="members">Miembros de Fairway</option>
              <option value="friends">Solo mis amigos</option>
            </select>
          </label>
          <div className="story-privacy-note">
            <Eye size={16} />
            <span>
              Solo tú verás las vistas y los likes de tu historia.
              {data.me.visibility === "private"
                ? " Tu perfil es privado: solo tú podrás verla hasta cambiar la visibilidad de tu perfil."
                : ""}
            </span>
          </div>
          {(!available || !data.user) && (
            <p className="story-form-notice">
              {data.demo
                ? "Conecta tu cuenta para publicar historias reales."
                : "Las historias estarán disponibles pronto."}
            </p>
          )}
          {error && (
            <p className="story-error" role="alert">
              {error}
            </p>
          )}
          <Button
            className="story-publish"
            disabled={!photo || preparing || busy || !available || !data.user}
            onClick={() => void publish()}
          >
            {busy ? (
              <LoaderCircle size={17} className="story-spinner" />
            ) : (
              <Plus size={17} />
            )}
            {busy ? "Publicando…" : "Compartir historia"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function StoryViewer({
  story,
  siblings,
  data,
  canPrevious,
  onPrevious,
  onNext,
  onClose,
  onSeen,
  onLiked,
  onRefresh,
}: {
  story?: Story;
  siblings: Story[];
  data: FairwayData;
  canPrevious: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  onSeen: (id: string) => void;
  onLiked: (id: string, liked: boolean) => void;
  onRefresh: () => Promise<void>;
}) {
  const [src, setSrc] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(
    typeof document !== "undefined" && document.hidden,
  );
  const [progress, setProgress] = useState(0);
  const [activity, setActivity] = useState(false);
  const [activityTab, setActivityTab] = useState("views");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [retry, setRetry] = useState(0);
  const seen = useRef(false);
  const next = useRef(onNext);
  next.current = onNext;
  const seenCallback = useRef(onSeen);
  seenCallback.current = onSeen;
  const own = story?.user_id === data.user?.id;
  const author = [data.me, ...data.profiles].find(
    (p) => p.id === story?.user_id,
  );
  const liked = !!story?.story_likes.some((l) => l.user_id === data.user?.id);
  const storyId = story?.id;
  const path = story?.media_path;
  const expiry = story?.expires_at;
  useEffect(() => {
    let cancelled = false;
    if (!supabase || !path || !expiry) return;
    async function loadPhoto() {
      const seconds = Math.min(
        60,
        Math.floor((new Date(expiry!).getTime() - Date.now()) / 1000),
      );
      if (seconds < 1) return;
      const result = await supabase!.storage
        .from("story-images")
        .createSignedUrl(path!, seconds);
      if (cancelled) return;
      if (result.error || !result.data) {
        setError("No pudimos abrir esta historia.");
        setReady(false);
      } else {
        setSrc(result.data.signedUrl);
        setError("");
      }
    }
    void loadPhoto();
    const interval = setInterval(() => void loadPhoto(), 45000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [storyId, path, expiry, retry]);
  useEffect(() => {
    const change = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  useEffect(() => {
    if (!ready || hidden || own || !storyId || seen.current || !supabase)
      return;
    let cancelled = false;
    void supabase.rpc("view_story", { story: storyId }).then((result) => {
      if (cancelled) return;
      if (result.error)
        setError("No pudimos registrar tu vista. Reintenta para continuar.");
      else {
        seen.current = true;
        seenCallback.current(storyId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ready, hidden, own, storyId, retry]);
  useEffect(() => {
    if (!ready || paused || hidden || activity || confirmDelete || error)
      return;
    let previous = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const delta = ((now - previous) / 7000) * 100;
      previous = now;
      setProgress((value) => Math.min(100, value + delta));
    }, 50);
    return () => clearInterval(interval);
  }, [ready, paused, hidden, activity, confirmDelete, error]);
  useEffect(() => {
    if (progress >= 100) next.current();
  }, [progress]);
  useEffect(() => {
    if (!activity) return;
    void onRefresh();
    // Actualizar la actividad mientras el autor la consulta.
    const interval = setInterval(() => void onRefresh(), 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity]);
  async function like() {
    if (!story || !supabase || busy) return;
    setBusy(true);
    try {
      const result = await supabase.rpc("like_story", {
        story: story.id,
        liked: !liked,
      });
      if (result.error) throw result.error;
      onSeen(story.id);
      onLiked(story.id, !liked);
    } catch {
      data.notify("No pudimos guardar tu like. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!story || !supabase || busy) return;
    setBusy(true);
    try {
      const result = await supabase.rpc("remove_story", { story: story.id });
      if (result.error) throw result.error;
      const storage = await supabase.storage
        .from("story-images")
        .remove([story.media_path]);
      data.notify(
        storage.error
          ? "Historia eliminada. La limpieza de su foto se reintentará más tarde."
          : "Historia eliminada.",
      );
      onClose();
      await onRefresh();
    } catch {
      data.notify("No pudimos eliminar la historia. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  const views = story?.story_views || [];
  const likes = story?.story_likes || [];
  const visibleViews =
    activityTab === "likes"
      ? views.filter((v) => likes.some((l) => l.user_id === v.user_id))
      : views;
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="story-viewer-overlay" />
        <Dialog.Content
          className="story-viewer"
          aria-describedby="story-viewer-description"
          onKeyDown={(e) => {
            if (activity || confirmDelete) return;
            if (e.key === "ArrowRight") {
              e.preventDefault();
              onNext();
            }
            if (e.key === "ArrowLeft" && canPrevious) {
              e.preventDefault();
              onPrevious();
            }
          }}
        >
          <Dialog.Title className="sr-only">
            Historia de {author?.name || "Golfista"}
          </Dialog.Title>
          <Dialog.Description id="story-viewer-description" className="sr-only">
            Fotografía disponible por 24 horas. Usa las flechas para cambiar de
            historia y el botón para pausar.
          </Dialog.Description>
          <button
            className="story-desktop-arrow previous"
            disabled={!canPrevious || busy}
            aria-label="Historia anterior"
            onClick={onPrevious}
          >
            <ChevronLeft />
          </button>
          <button
            className="story-desktop-arrow next"
            disabled={busy}
            aria-label="Siguiente historia"
            onClick={onNext}
          >
            <ChevronRight />
          </button>
          <div className="story-stage">
            {src && story && (
              <img
                className="story-media"
                src={src}
                alt={
                  story.caption ||
                  `Momento de golf de ${author?.name || "un golfista"}`
                }
                onLoad={() => setReady(true)}
                onError={() => {
                  setError("No pudimos cargar la fotografía.");
                  setReady(false);
                }}
              />
            )}
            <div className="story-stage-shade" />
            <div className="story-viewer-top">
              <div className="story-progress" aria-hidden="true">
                {siblings.map((s) => (
                  <span key={s.id}>
                    <i
                      style={{
                        width: `${s.id === storyId ? progress : s.created_at < (story?.created_at || "") ? 100 : 0}%`,
                      }}
                    />
                  </span>
                ))}
              </div>
              <div className="story-author">
                <PersonAvatar
                  photo={author?.photo}
                  name={author?.name || "Golfista"}
                />
                <div>
                  <strong>
                    {own ? "Tu historia" : author?.name || "Golfista"}
                  </strong>
                  <small>
                    {story && storyTime(story.created_at)} ·{" "}
                    {story?.audience === "friends" ? "Amigos" : "Fairway"}
                  </small>
                </div>
                <button
                  className="story-control"
                  aria-label={paused ? "Reanudar historia" : "Pausar historia"}
                  onClick={() => setPaused(!paused)}
                >
                  {paused ? <Play size={19} /> : <Pause size={19} />}
                </button>
                <Dialog.Close
                  className="story-control"
                  aria-label="Cerrar historia"
                  disabled={busy}
                >
                  <X size={23} />
                </Dialog.Close>
              </div>
            </div>
            {story && (
              <div className="story-tap-navigation">
                <button
                  aria-label="Anterior"
                  disabled={!canPrevious || busy}
                  onClick={onPrevious}
                />
                <button
                  aria-label="Siguiente"
                  disabled={busy}
                  onClick={onNext}
                />
              </div>
            )}
            {(!story || error || !ready) && (
              <div className="story-load-state" role="status">
                {!story ? (
                  <>
                    <Clock3 size={30} />
                    <strong>Este momento ya pasó.</strong>
                    <p>La historia venció o ya no está disponible.</p>
                    <button onClick={onNext}>
                      Ver la siguiente
                      <ChevronRight size={16} />
                    </button>
                  </>
                ) : error ? (
                  <>
                    <Camera size={30} />
                    <strong>{error}</strong>
                    <button
                      onClick={() => {
                        setError("");
                        setSrc("");
                        setReady(false);
                        setRetry(retry + 1);
                      }}
                    >
                      Reintentar
                      <RefreshCw size={15} />
                    </button>
                  </>
                ) : (
                  <LoaderCircle className="story-spinner" size={30} />
                )}
              </div>
            )}
            {story && (
              <div className="story-viewer-bottom">
                <p className="story-caption">{story.caption}</p>
                <div className="story-viewer-actions">
                  {own ? (
                    <>
                      <button
                        className="story-activity-button"
                        onClick={() => setActivity(true)}
                      >
                        <span>
                          <Eye size={19} />
                          {views.length}
                        </span>
                        <span>
                          <Heart size={18} />
                          {likes.length}
                        </span>
                        <small>
                          Ver actividad
                          <ChevronRight size={13} />
                        </small>
                      </button>
                      <button
                        className="story-control"
                        aria-label="Eliminar historia"
                        disabled={busy}
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 size={19} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="story-like-note">
                        Un buen momento merece un like.
                      </span>
                      <button
                        className={`story-like ${liked ? "liked" : ""}`}
                        aria-label={
                          liked
                            ? "Quitar like a la historia"
                            : "Dar like a la historia"
                        }
                        aria-pressed={liked}
                        disabled={busy || !ready || !!error}
                        onClick={() => void like()}
                      >
                        <Heart
                          size={25}
                          fill={liked ? "currentColor" : "none"}
                        />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            {activity && own && (
              <div className="story-activity-sheet">
                <div className="story-sheet-heading">
                  <div>
                    <span className="eyebrow">TU HISTORIA</span>
                    <h3>Cada momento conecta.</h3>
                  </div>
                  <button
                    className="icon-btn"
                    aria-label="Cerrar actividad"
                    onClick={() => setActivity(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="story-metric-tabs">
                  <button
                    className={activityTab === "views" ? "active" : ""}
                    onClick={() => setActivityTab("views")}
                  >
                    <Eye size={17} />
                    Vistas <b>{views.length}</b>
                  </button>
                  <button
                    className={activityTab === "likes" ? "active" : ""}
                    onClick={() => setActivityTab("likes")}
                  >
                    <Heart size={17} />
                    Likes <b>{likes.length}</b>
                  </button>
                </div>
                <div className="story-viewer-list">
                  {!visibleViews.length ? (
                    <div className="story-activity-empty">
                      <Users size={28} strokeWidth={1.3} />
                      <strong>
                        {activityTab === "views"
                          ? "Tu historia acaba de empezar."
                          : "Los likes aparecerán aquí."}
                      </strong>
                      <p>
                        {activityTab === "views"
                          ? "Aquí verás quién pasó a verla."
                          : "Descubre a quién le gustó este momento."}
                      </p>
                    </div>
                  ) : (
                    [...visibleViews]
                      .sort((a, b) => b.viewed_at.localeCompare(a.viewed_at))
                      .map((v) => {
                        const person = data.profiles.find(
                          (p) => p.id === v.user_id,
                        );
                        return (
                          <div className="story-viewer-row" key={v.user_id}>
                            <PersonAvatar
                              photo={person?.photo}
                              name={person?.name || "Golfista"}
                            />
                            <div>
                              <strong>{person?.name || "Golfista"}</strong>
                              <small>Hace {storyTime(v.viewed_at)}</small>
                            </div>
                            {likes.some((l) => l.user_id === v.user_id) && (
                              <Heart
                                size={18}
                                fill="currentColor"
                                className="liked"
                                aria-label="Le gustó tu historia"
                              />
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
                <div className="story-activity-footer">
                  <Check size={13} />
                  Cada persona cuenta como una sola vista.
                </div>
              </div>
            )}
            {confirmDelete && (
              <div
                className="story-delete-confirm"
                role="alertdialog"
                aria-label="Confirmar eliminación de historia"
              >
                <Trash2 size={26} />
                <h3>¿Eliminar esta historia?</h3>
                <p>
                  Se quitará de las historias y se eliminarán sus vistas y
                  likes.
                </p>
                <Button disabled={busy} onClick={() => void remove()}>
                  {busy ? "Eliminando…" : "Eliminar historia"}
                </Button>
                <button disabled={busy} onClick={() => setConfirmDelete(false)}>
                  Conservar historia
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
