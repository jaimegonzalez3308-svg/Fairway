"use client";
import { useEffect, useState } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Flag,
  Bookmark,
  UserPlus,
} from "lucide-react";
import { Button, Empty } from "./ui";
import { supabase } from "@/lib/supabase";
import type { FairwayData } from "@/lib/use-fairway";
import { Stories } from "./stories";
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
    [following, setFollowing] = useState<string[]>([]);
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
  }, [data.user]);
  const all = [data.me, ...data.profiles];
  return (
    <>
      <Stories data={data} />
      <div className="tabs">
        {["Para ti", "Siguiendo", "Mi club", "León"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={t === tab ? "active" : ""}
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
              supabase!
                .from("posts")
                .insert({ user_id: data.user!.id, body, privacy: "public" }),
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
              : tab === "León"
                ? profile?.city === "León"
                : true;
        })
        .map((p) => {
          const profile = all.find((u) => u.id === p.user_id);
          return (
            <article className="panel post" key={p.id}>
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
                  className={
                    p.reactions.some((r) => r.user_id === data.user?.id)
                      ? "liked"
                      : ""
                  }
                  onClick={async () => {
                    await data.run(() =>
                      p.reactions.some((r) => r.user_id === data.user?.id)
                        ? supabase!
                            .from("reactions")
                            .delete()
                            .eq("post_id", p.id)
                            .eq("user_id", data.user!.id)
                        : supabase!
                            .from("reactions")
                            .insert({ post_id: p.id, user_id: data.user!.id }),
                    );
                    void load();
                  }}
                >
                  <Heart size={18} />
                  {p.reactions.length}
                </button>
                <span>
                  <MessageCircle size={18} />
                  {p.comments.length}
                </span>
                {p.user_id !== data.user?.id && (
                  <button
                    onClick={async () => {
                      await data.run(
                        () =>
                          following.includes(p.user_id)
                            ? supabase!
                                .from("followers")
                                .delete()
                                .eq("user_id", data.user!.id)
                                .eq("target_id", p.user_id)
                            : supabase!.from("followers").insert({
                                user_id: data.user!.id,
                                target_id: p.user_id,
                              }),
                        following.includes(p.user_id)
                          ? "Dejaste de seguir este perfil."
                          : "Solicitud de seguimiento enviada.",
                      );
                      void load();
                    }}
                  >
                    <UserPlus size={16} />
                    {following.includes(p.user_id) ? "Solicitado" : "Seguir"}
                  </button>
                )}
              </div>
              {p.comments.map((c) => (
                <p className="comment" key={c.id}>
                  <strong>
                    {all.find((u) => u.id === c.user_id)?.name || "Golfista"}:
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
                    setComment((x) => ({ ...x, [p.id]: e.target.value }))
                  }
                  required
                  maxLength={1000}
                />
                <button className="icon-btn" aria-label="Enviar comentario">
                  <Send size={17} />
                </button>
              </form>
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
    </>
  );
}
