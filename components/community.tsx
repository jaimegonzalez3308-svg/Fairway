"use client";
import { NATIVE_RESUME } from "@/lib/native-support";
import { useEffect, useRef, useState } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Flag,
  Bookmark,
  UserPlus,
  Check,
  ChevronDown,
} from "lucide-react";
import { Button, Empty } from "./ui";
import { supabase } from "@/lib/supabase";
import type { FairwayData } from "@/lib/use-fairway";
import { Stories } from "./stories";
import { matchesCity } from "@/lib/cities";
import { suggestFollows } from "@/lib/community-suggestions";
type Post = {
  id: string;
  user_id: string;
  body: string;
  photo: string | null;
  created_at: string;
  privacy: string;
  comments: { id: string; body: string; user_id: string }[];
  reactions: { user_id: string }[];
};
export function Community({ data }: { data: FairwayData }) {
  const [posts, setPosts] = useState<Post[]>([]),
    [tab, setTab] = useState("Para ti"),
    [body, setBody] = useState(""),
    [comment, setComment] = useState<Record<string, string>>({}),
    // Replies start folded; each post opens with its own arrow.
    [openReplies, setOpenReplies] = useState<Record<string, boolean>>({}),
    [following, setFollowing] = useState<string[]>([]),
    [followedHere, setFollowedHere] = useState<string[]>([]),
    [burst, setBurst] = useState<string | null>(null);
  const lastTap = useRef<{ id: string; at: number } | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const liking = useRef<Set<string>>(new Set());
  async function load() {
    if (!supabase || !data.user) return;
    const [{ data: rows, error }, { data: f }] = await Promise.all([
      supabase
        .from("posts")
        .select("*,comments(id,body,user_id),reactions(user_id)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("followers")
        .select("target_id")
        .eq("user_id", data.user.id),
    ]);
    if (error) data.notify(error.message);
    else setPosts(rows as Post[]);
    setFollowing(f?.map((x) => x.target_id) || []);
  }
  useEffect(() => {
    void load();
    const resume = () => {
      void load();
    };
    window.addEventListener(NATIVE_RESUME, resume);
    window.addEventListener("fairway:manual-refresh", resume);
    return () => {
      window.removeEventListener(NATIVE_RESUME, resume);
      window.removeEventListener("fairway:manual-refresh", resume);
    };
  }, [data.user]);
  const all = [data.me, ...data.profiles];
  async function toggleLike(p: Post) {
    if (liking.current.has(p.id)) return;
    liking.current.add(p.id);
    try {
      await likeRequest(p);
    } finally {
      liking.current.delete(p.id);
    }
  }
  async function likeRequest(p: Post) {
    await data.run(() =>
      p.reactions.some((r) => r.user_id === data.user?.id)
        ? supabase!
            .from("reactions")
            .delete()
            .eq("post_id", p.id)
            .eq("user_id", data.user!.id)
        : supabase!.from("reactions").insert({
            post_id: p.id,
            user_id: data.user!.id,
          }),
    );
    void load();
  }
  async function toggleFollow(targetId: string) {
    const isFollowing = following.includes(targetId);
    await data.run(
      () =>
        isFollowing
          ? supabase!
              .from("followers")
              .delete()
              .eq("user_id", data.user!.id)
              .eq("target_id", targetId)
          : supabase!.from("followers").insert({
              user_id: data.user!.id,
              target_id: targetId,
            }),
      isFollowing
        ? "Dejaste de seguir este perfil."
        : "Solicitud de seguimiento enviada.",
    );
    void load();
  }
  const clubName = (id: string | null) =>
    data.clubs.find((c) => c.id === id)?.name;
  const myClub = clubName(data.me.club_id);
  const clubmates = data.me.club_id
    ? data.profiles.filter(
        (p) => p.id !== data.me.id && p.club_id === data.me.club_id,
      ).length
    : 0;
  const suggestions = suggestFollows(
    data.me,
    data.profiles,
    following,
    followedHere,
  );
  return (
    <>
      <Stories data={data} />
      <section
        className="community-feed"
        aria-labelledby="community-feed-title"
      >
        <header className="community-feed-heading">
          <h2 id="community-feed-title">
            Lo que se dice en el club<span>.</span>
          </h2>
        </header>
        <div className="community-board">
          <div className="community-feed-main">
            <div className="tabs community-tabs">
              {["Para ti", "Siguiendo", "Mi club", "Mi ciudad"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={t === tab ? "active" : ""}
                  aria-pressed={t === tab}
                >
                  {t}
                </button>
              ))}
            </div>
            <form
              className="panel composer"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!body.trim()) return;
                const ok = await data.run(
                  () =>
                    supabase!.from("posts").insert({
                      user_id: data.user!.id,
                      body,
                      privacy: "public",
                    }),
                  "Publicación compartida.",
                );
                if (ok) {
                  setBody("");
                  void load();
                }
              }}
            >
              <div className="avatar">{data.me.name[0]}</div>
              <textarea
                aria-label="Nueva publicación"
                placeholder="¿Qué tal estuvo tu última ronda?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                required
              />
              <Button type="submit">
                <Send size={16} />
                Publicar
              </Button>
            </form>
            {posts
              .filter((p) => {
                const profile = all.find((u) => u.id === p.user_id);
                return tab === "Siguiendo"
                  ? following.includes(p.user_id)
                  : tab === "Mi club"
                    ? profile?.club_id === data.me.club_id
                    : tab === "Mi ciudad"
                      ? matchesCity(profile?.city, "mine", data.me.city)
                      : true;
              })
              .map((p) => {
                const profile = all.find((u) => u.id === p.user_id);
                return (
                  <article
                    className="panel post"
                    key={p.id}
                    onTouchStart={(event) => {
                      const t = event.touches[0];
                      touchStart.current = t
                        ? { x: t.clientX, y: t.clientY }
                        : null;
                    }}
                    onTouchEnd={(event) => {
                      // iOS app: double-tap a post to like it, as in social apps.
                      const root = document.documentElement;
                      const start = touchStart.current;
                      const end = event.changedTouches[0];
                      if (
                        !root.classList.contains("native-ios") ||
                        root.dataset.nativeScreenReader === "true" ||
                        !start ||
                        !end ||
                        Math.hypot(
                          end.clientX - start.x,
                          end.clientY - start.y,
                        ) > 10 ||
                        (event.target as Element).closest(
                          "button,a,input,textarea,form",
                        )
                      ) {
                        lastTap.current = null;
                        return;
                      }
                      const now = Date.now();
                      const last = lastTap.current;
                      lastTap.current = { id: p.id, at: now };
                      if (last?.id !== p.id || now - last.at > 320) return;
                      lastTap.current = null;
                      event.preventDefault();
                      setBurst(p.id);
                      window.setTimeout(
                        () => setBurst((id) => (id === p.id ? null : id)),
                        700,
                      );
                      if (!p.reactions.some((r) => r.user_id === data.user?.id))
                        void toggleLike(p);
                    }}
                  >
                    {burst === p.id && (
                      <span className="post-like-burst" aria-hidden="true">
                        <Heart size={84} fill="currentColor" />
                      </span>
                    )}
                    <div className="post-author">
                      <div className="avatar">{profile?.name[0] || "G"}</div>
                      <div>
                        <strong>{profile?.name || "Golfista"}</strong>
                        <small>
                          {new Date(p.created_at).toLocaleDateString("es-MX")}
                        </small>
                      </div>
                      <button
                        className="icon-btn"
                        aria-label="Reportar publicación"
                        onClick={async () => {
                          const reason = window.prompt(
                            "Describe el motivo del reporte (mínimo 5 caracteres):",
                          );
                          if (reason && reason.length >= 5)
                            await data.run(
                              () =>
                                supabase!.from("reports").insert({
                                  user_id: data.user!.id,
                                  target_id: p.user_id,
                                  reason: `Publicación ${p.id}: ${reason}`,
                                }),
                              "Reporte enviado.",
                            );
                        }}
                      >
                        <Flag size={16} />
                      </button>
                    </div>
                    <p>{p.body}</p>
                    {p.photo && (
                      <img
                        className="post-photo"
                        src={p.photo}
                        alt="Fotografía de la publicación"
                      />
                    )}
                    <div className="post-actions">
                      <button
                        aria-label={`${p.reactions.some((r) => r.user_id === data.user?.id) ? "Quitar me gusta" : "Me gusta"}, ${p.reactions.length} reacciones`}
                        aria-pressed={p.reactions.some(
                          (r) => r.user_id === data.user?.id,
                        )}
                        className={
                          p.reactions.some((r) => r.user_id === data.user?.id)
                            ? "liked"
                            : ""
                        }
                        onClick={() => void toggleLike(p)}
                      >
                        <Heart size={18} />
                        {p.reactions.length}
                      </button>
                      <button
                        type="button"
                        className="replies-toggle"
                        aria-expanded={!!openReplies[p.id]}
                        aria-controls={`replies-${p.id}`}
                        aria-label={
                          openReplies[p.id]
                            ? "Ocultar respuestas"
                            : p.comments.length
                              ? `Ver ${p.comments.length} ${p.comments.length === 1 ? "respuesta" : "respuestas"}`
                              : "Responder"
                        }
                        onClick={() =>
                          setOpenReplies((x) => ({ ...x, [p.id]: !x[p.id] }))
                        }
                      >
                        <MessageCircle size={18} aria-hidden="true" />
                        {p.comments.length}
                        <ChevronDown
                          size={15}
                          className="replies-chevron"
                          aria-hidden="true"
                        />
                      </button>
                      {p.user_id !== data.user?.id && (
                        <button onClick={() => void toggleFollow(p.user_id)}>
                          <UserPlus size={16} />
                          {following.includes(p.user_id)
                            ? "Solicitado"
                            : "Seguir"}
                        </button>
                      )}
                    </div>
                    <div
                      className="post-replies"
                      id={`replies-${p.id}`}
                      hidden={!openReplies[p.id]}
                    >
                      {p.comments.map((c) => (
                        <p className="comment" key={c.id}>
                          <strong>
                            {all.find((u) => u.id === c.user_id)?.name ||
                              "Golfista"}
                            :
                          </strong>{" "}
                          {c.body}
                        </p>
                      ))}
                      <form
                        className="comment-form"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const ok = await data.run(() =>
                            supabase!.from("comments").insert({
                              post_id: p.id,
                              user_id: data.user!.id,
                              body: comment[p.id],
                            }),
                          );
                          if (ok) {
                            setComment((x) => ({ ...x, [p.id]: "" }));
                            void load();
                          }
                        }}
                      >
                        <input
                          aria-label="Escribe un comentario"
                          placeholder="Escribe un comentario…"
                          value={comment[p.id] || ""}
                          onChange={(e) =>
                            setComment((x) => ({
                              ...x,
                              [p.id]: e.target.value,
                            }))
                          }
                          required
                          maxLength={1000}
                        />
                        <button
                          className="icon-btn"
                          aria-label="Enviar comentario"
                        >
                          <Send size={17} />
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            {!posts.length && (
              <Empty
                title="La conversación empieza contigo"
                description={
                  data.demo
                    ? "El feed real estará disponible cuando conectes Supabase. Las publicaciones no se simulan."
                    : "Comparte un logro, una historia o tu próxima ronda con la comunidad."
                }
              />
            )}
          </div>
          <aside
            className="community-rail"
            aria-label="Tu club y a quién seguir"
          >
            <section className="community-rail-club">
              <h3>Tu club</h3>
              <strong>{myClub || "Sin club declarado"}</strong>
              <p>
                {myClub
                  ? `${clubmates} ${clubmates === 1 ? "golfista más juega" : "golfistas más juegan"} aquí en Fairway.`
                  : "Agrega tu club en tu perfil para ver quién juega ahí."}
              </p>
            </section>
            {!!suggestions.length && (
              <section className="community-rail-follow">
                <h3>A quién seguir</h3>
                <ul>
                  {suggestions.map((p) => (
                    <li key={p.id}>
                      <span className="avatar">
                        {p.photo ? <img src={p.photo} alt="" /> : p.name[0]}
                      </span>
                      <span>
                        <strong>{p.name}</strong>
                        <small>
                          {[
                            clubName(p.club_id) || p.city,
                            p.handicap === null ? null : `HCP ${p.handicap}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </span>
                      <button
                        type="button"
                        className={
                          following.includes(p.id) ? "requested" : undefined
                        }
                        aria-pressed={following.includes(p.id)}
                        onClick={() => {
                          setFollowedHere((ids) =>
                            ids.includes(p.id) ? ids : [...ids, p.id],
                          );
                          void toggleFollow(p.id);
                        }}
                        aria-label={`Seguir a ${p.name}`}
                      >
                        {following.includes(p.id) ? (
                          <Check size={15} />
                        ) : (
                          <UserPlus size={15} />
                        )}
                        {following.includes(p.id) ? "Solicitado" : "Seguir"}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
