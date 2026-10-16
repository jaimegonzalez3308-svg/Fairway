"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button, Empty, Modal, SectionHeading } from "./ui";
import { supabase } from "@/lib/supabase";
import { nameSearchPattern } from "@/lib/profile-share";
import { profileWithPhoto, type FriendsData } from "@/lib/use-friends";
import type { FairwayData } from "@/lib/use-fairway";
import type { Profile } from "@/lib/domain";

export function FriendshipActions({
  personId,
  friends,
  userId,
}: {
  personId: string;
  friends: FriendsData;
  userId: string;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const relation = friends.relations.find(
    (r) => r.requester_id === personId || r.recipient_id === personId,
  );
  const busy = !!friends.busy;
  if (personId === userId) return null;
  if (!friends.available)
    return (
      <p className="muted">
        {friends.loading
          ? "Cargando amistad…"
          : "Las solicitudes de amistad no están disponibles en este momento."}
      </p>
    );
  if (!relation)
    return (
      <Button disabled={busy} onClick={() => void friends.request(personId)}>
        <UserPlus size={16} />
        {friends.busy === personId ? "Enviando…" : "Agregar amigo"}
      </Button>
    );
  if (relation.status === "accepted")
    return (
      <>
        <span className="friend-status">
          <Check size={15} />
          Ya son amigos
        </span>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => setConfirmRemove(true)}
        >
          Eliminar amistad
        </button>
        {confirmRemove && (
          <Modal
            title="Eliminar amistad"
            onClose={() => setConfirmRemove(false)}
          >
            <p>
              Dejarán de aparecer en sus listas de amigos. Podrán enviarse otra
              solicitud más adelante.
            </p>
            <div className="button-row">
              <Button variant="outline" onClick={() => setConfirmRemove(false)}>
                Conservar amistad
              </Button>
              <Button
                disabled={busy}
                onClick={async () => {
                  if (await friends.respond(relation.id, "remove"))
                    setConfirmRemove(false);
                }}
              >
                Eliminar amistad
              </Button>
            </div>
          </Modal>
        )}
      </>
    );
  if (relation.requester_id === userId)
    return (
      <>
        <span className="friend-status">
          <Clock3 size={15} />
          Solicitud enviada
        </span>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void friends.respond(relation.id, "cancel")}
        >
          Cancelar solicitud
        </Button>
      </>
    );
  return (
    <>
      <Button
        disabled={busy}
        onClick={() => void friends.respond(relation.id, "accept")}
      >
        <Check size={16} />
        Aceptar solicitud
      </Button>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => void friends.respond(relation.id, "reject")}
      >
        <X size={16} />
        Rechazar
      </Button>
    </>
  );
}

export function Friends({
  data,
  friends,
  onProfile,
}: {
  data: FairwayData;
  friends: FriendsData;
  onProfile: (p: Profile) => void;
}) {
  const [tab, setTab] = useState("Buscar personas"),
    [query, setQuery] = useState(""),
    [results, setResults] = useState<Profile[]>([]),
    [searching, setSearching] = useState(false),
    [searchError, setSearchError] = useState("");
  const generation = useRef(0);
  useEffect(() => {
    const version = ++generation.current;
    setResults([]);
    setSearchError("");
    if (query.trim().length < 2 || !data.user || !supabase) {
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const result = await supabase!
        .from("profiles")
        .select("*")
        .neq("id", data.user!.id)
        .ilike("name", nameSearchPattern(query))
        .order("name")
        .limit(30);
      if (version !== generation.current) return;
      if (result.error) {
        setSearchError("No pudimos completar la búsqueda. Revisa tu conexión.");
        setSearching(false);
        return;
      }
      const profiles = await Promise.all(
        (result.data as Profile[]).map(profileWithPhoto),
      );
      if (version !== generation.current) return;
      setResults(profiles);
      setSearching(false);
    }, 300);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [query, data.user?.id]);
  const incoming = friends.relations.filter(
    (r) => r.status === "pending" && r.recipient_id === data.user?.id,
  );
  const rows = friends.relations.filter((r) =>
    tab === "Mis amigos"
      ? r.status === "accepted"
      : tab === "Solicitudes recibidas"
        ? r.status === "pending" && r.recipient_id === data.user?.id
        : r.status === "pending" && r.requester_id === data.user?.id,
  );
  const cards =
    tab === "Buscar personas"
      ? results
      : rows
          .map((r) =>
            friends.people.find(
              (p) =>
                p.id ===
                (r.requester_id === data.user?.id
                  ? r.recipient_id
                  : r.requester_id),
            ),
          )
          .filter((p): p is Profile => !!p);
  return (
    <>
      <SectionHeading
        eyebrow="EL GOLF SE COMPARTE"
        title="Tu círculo de golf"
        description="Busca a tus conocidos por nombre y encuentra nuevas personas con quienes compartir una ronda."
        action={
          <Button
            variant="outline"
            disabled={friends.loading}
            onClick={() => void friends.refresh()}
          >
            Actualizar solicitudes
          </Button>
        }
      />
      <div className="panel friends-intro">
        <span className="friends-intro-icon">
          <Users size={25} />
        </span>
        <div>
          <h2>La próxima ronda, entre amigos.</h2>
          <p>
            Envía una solicitud desde cualquier perfil. La amistad se confirma
            cuando la otra persona la acepta.
          </p>
        </div>
      </div>
      <div className="tabs friends-tabs">
        {[
          "Buscar personas",
          "Mis amigos",
          "Solicitudes recibidas",
          "Solicitudes enviadas",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "Solicitudes recibidas" && incoming.length > 0 && (
              <span className="friend-count">{incoming.length}</span>
            )}
          </button>
        ))}
      </div>
      {friends.error && (
        <div className="notice" role="status">
          {friends.error}
        </div>
      )}
      {tab === "Buscar personas" && (
        <div className="friends-search">
          <label htmlFor="friend-name">Buscar por nombre</label>
          <div>
            <Search size={19} />
            <input
              id="friend-name"
              type="search"
              placeholder="Escribe al menos 2 letras…"
              value={query}
              maxLength={80}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <small>
            Solo aparecen perfiles visibles para tu cuenta. Se muestran hasta 30
            coincidencias; agrega más letras para afinar.
          </small>
        </div>
      )}
      {searchError && (
        <p className="error-text" role="alert">
          {searchError}
        </p>
      )}
      {searching && tab === "Buscar personas" ? (
        <p role="status">Buscando personas…</p>
      ) : friends.loading && tab !== "Buscar personas" ? (
        <p role="status">Cargando tus amistades…</p>
      ) : (
        <>
          <div className="friend-grid">
            {cards.map((p) => (
              <article className="panel friend-card" key={p.id}>
                <button
                  className="friend-identity"
                  onClick={() => onProfile(p)}
                >
                  <img src={p.photo || "/images/avatar.svg"} alt="" />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.city}</small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
                <div className="friend-card-actions">
                  <FriendshipActions
                    personId={p.id}
                    friends={friends}
                    userId={data.user?.id || ""}
                  />
                  <button className="text-button" onClick={() => onProfile(p)}>
                    Ver perfil
                  </button>
                </div>
              </article>
            ))}
          </div>
          {tab !== "Buscar personas" &&
            rows
              .filter(
                (r) =>
                  !friends.people.some(
                    (p) =>
                      p.id ===
                      (r.requester_id === data.user?.id
                        ? r.recipient_id
                        : r.requester_id),
                  ),
              )
              .map((r) => (
                <div className="panel friend-unavailable" key={r.id}>
                  <span>Perfil no disponible por su privacidad o estado.</span>
                  <Button
                    variant="outline"
                    disabled={!!friends.busy}
                    onClick={() =>
                      void friends.respond(
                        r.id,
                        r.status === "accepted"
                          ? "remove"
                          : r.requester_id === data.user?.id
                            ? "cancel"
                            : "reject",
                      )
                    }
                  >
                    {r.status === "accepted"
                      ? "Eliminar amistad"
                      : r.requester_id === data.user?.id
                        ? "Cancelar solicitud"
                        : "Rechazar solicitud"}
                  </Button>
                </div>
              ))}
          {!cards.length &&
            (tab === "Buscar personas" || !rows.length) &&
            !searchError && (
              <Empty
                title={
                  tab === "Buscar personas"
                    ? query.trim().length < 2
                      ? "Encuentra a tu próximo compañero"
                      : "No encontramos coincidencias"
                    : tab === "Mis amigos"
                      ? "Tu círculo empieza aquí"
                      : tab === "Solicitudes recibidas"
                        ? "Todo al día"
                        : "Aún no has enviado solicitudes"
                }
                description={
                  tab === "Buscar personas"
                    ? query.trim().length < 2
                      ? "Busca por el nombre que la persona utiliza en Fairway."
                      : "Prueba con otro nombre. Los perfiles privados y bloqueados no aparecen."
                    : tab === "Mis amigos"
                      ? "Busca a alguien que conozcas y envíale una solicitud de amistad."
                      : "Las nuevas solicitudes aparecerán aquí."
                }
              />
            )}
        </>
      )}
    </>
  );
}
