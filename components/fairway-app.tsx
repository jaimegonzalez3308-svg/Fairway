"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Compass,
  Flag,
  Users,
  MessageCircle,
  UserRound,
  BarChart3,
  MapPin,
  Bell,
  Search,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  Plus,
  SlidersHorizontal,
  Heart,
  X,
  Bookmark,
  Star,
  CalendarDays,
  Clock,
  Check,
  CheckCheck,
  Menu,
  Settings as SettingsIcon,
  LogOut,
  ShieldCheck,
  Target,
  Sun,
  Leaf,
  RotateCcw,
  Send,
  MoreHorizontal,
  Info,
  Globe,
  TrendingUp,
  Trash2,
  LockKeyhole,
  QrCode,
} from "lucide-react";
import { useFairway } from "@/lib/use-fairway";
import { supabase } from "@/lib/supabase";
import { authReturnError, routeFromHash } from "@/lib/auth";
import {
  compatibility,
  matchesFilters,
  initialFilters,
  days,
  summarize,
  type Profile,
  type Filters,
  type Game,
  type Round,
} from "@/lib/domain";
import { cn, dateFormat, timeFormat } from "@/lib/utils";
import { Button, Modal, Field, Empty, SectionHeading, InlineLink } from "./ui";
import { AuthForm, ProfileForm, GameForm, ReviewForm } from "./forms";
import { Scorecard } from "./scorecard";
import { Stats } from "./stats";
import { Community } from "./community";
import { Settings, Admin } from "./settings";
import {
  AccountRequired,
  ClubDirectory,
  GuestDiscover,
  LockedPreview,
  PublicPrivacy,
} from "./guest-experience";
import { DeleteAccountDialog } from "./delete-account";
import { requiresAccount } from "@/lib/access";
import { useFriends, profileWithPhoto } from "@/lib/use-friends";
import { sharedProfileId } from "@/lib/profile-share";
import { Friends, FriendshipActions } from "./friends";
import { ProfileQR } from "./profile-qr";
import { Parties } from "./parties";
import { GameJoinActions } from "./game-join-actions";
import { gameIsUpcoming, golfDate } from "@/lib/parties";
const navigation = [
  { id: "descubrir", label: "Descubrir", icon: Compass },
  { id: "partidas", label: "Partidas", icon: Flag },
  { id: "comunidad", label: "Comunidad", icon: Users },
  { id: "amigos", label: "Amigos", icon: Users },
  { id: "mensajes", label: "Mensajes", icon: MessageCircle },
  { id: "perfil", label: "Mi perfil", icon: UserRound },
];
const extras = [
  { id: "scores", label: "Mis scores", icon: Target },
  { id: "estadisticas", label: "Estadísticas", icon: BarChart3 },
  { id: "clubes", label: "Clubes de golf", icon: MapPin },
];
export default function FairwayApp() {
  const data = useFairway();
  const friends = useFriends(data);
  const [page, setPage] = useState("descubrir"),
    [modal, setModal] = useState<string | null>(null),
    [authNotice, setAuthNotice] = useState(""),
    [authMode, setAuthMode] = useState<"login" | "signup">("login"),
    [gateFeature, setGateFeature] = useState("perfil"),
    [selected, setSelected] = useState<Profile | null>(null),
    [game, setGame] = useState<Game | null>(null),
    [partyDate, setPartyDate] = useState<string | undefined>(),
    [partyCalendarDate, setPartyCalendarDate] = useState(() => golfDate()),
    [round, setRound] = useState<Round | undefined>(),
    [filters, setFilters] = useState<Filters>(initialFilters),
    [draftFilters, setDraftFilters] = useState<Filters>(initialFilters),
    [tab, setTab] = useState("Para ti"),
    [search, setSearch] = useState(""),
    [mobileOpen, setMobileOpen] = useState(false),
    [activeChat, setActiveChat] = useState<string | null>(null),
    [message, setMessage] = useState(""),
    [profileTab, setProfileTab] = useState("Información"),
    [reviewTarget, setReviewTarget] = useState<Profile | null>(null),
    [busy, setBusy] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const onboarded = useRef<string | null>(null);
  const lastPublicPage = useRef("descubrir");
  const deletionReturn = useRef(false);
  const sharedProfileHandled = useRef<string | null>(null);
  function openAuth(mode: "login" | "signup" = "login") {
    setAuthMode(mode);
    setModal("auth");
  }
  function requireAccount(feature: string) {
    setGateFeature(feature);
    setModal("account-required");
    setMobileOpen(false);
  }
  async function logout() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      data.notify(error.message);
      return;
    }
    setModal(null);
    setPage("inicio");
    window.history.replaceState(null, "", location.pathname + "#inicio");
    data.notify("Cerraste sesión. Nos vemos pronto en el green.");
  }
  useEffect(() => {
    if (
      !data.loading &&
      !data.user &&
      !data.demo &&
      requiresAccount(page) &&
      !["auth", "account-required", "delete-account"].includes(modal || "")
    )
      requireAccount(page);
  }, [page, data.loading, data.user, data.demo, modal]);
  useEffect(() => {
    if (data.user && deletionReturn.current) {
      deletionReturn.current = false;
      setModal("delete-account");
    }
  }, [data.user]);
  useEffect(() => {
    if (
      data.user &&
      !data.loading &&
      !deletionReturn.current &&
      !["delete-account", "auth"].includes(modal || "") &&
      data.me.id === data.user.id &&
      data.me.availability.length === 0 &&
      !sharedProfileId(location.search) &&
      onboarded.current !== data.user.id
    ) {
      onboarded.current = data.user.id;
      setModal("edit-profile");
    }
  }, [data.user, data.loading, data.me]);
  useEffect(() => {
    const id = sharedProfileId(location.search);
    if (
      !id ||
      data.loading ||
      !data.user ||
      !supabase ||
      sharedProfileHandled.current === id
    )
      return;
    sharedProfileHandled.current = id;
    let current = true;
    void supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(async ({ data: profile, error }) => {
        if (!current) return;
        if (error || !profile) {
          setModal("profile-unavailable");
          return;
        }
        if (id === data.user!.id) {
          setPage("perfil");
          setModal(null);
          const url = new URL(location.href);
          url.searchParams.delete("golfista");
          url.hash = "perfil";
          window.history.replaceState(
            null,
            "",
            url.pathname + url.search + url.hash,
          );
          return;
        }
        const p = await profileWithPhoto(profile as Profile);
        if (current) {
          setSelected(p);
          setModal("profile");
        }
      });
    return () => {
      current = false;
      sharedProfileHandled.current = null;
    };
  }, [data.user?.id, data.loading]);
  function go(p: string) {
    setPage(p);
    setMobileOpen(false);
    if (!requiresAccount(p)) lastPublicPage.current = p;
    if (!data.user && !data.demo && requiresAccount(p)) requireAccount(p);
    window.history.replaceState(null, "", "#" + p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  useEffect(() => {
    const routes = [
      ...navigation,
      ...extras,
      { id: "ajustes" },
      { id: "hoy" },
      { id: "admin" },
      { id: "inicio" },
      { id: "privacidad" },
    ].map((n) => n.id);
    const recovery =
      new URLSearchParams(location.search).get("recovery") === "1";
    const deletion =
      new URLSearchParams(location.search).get("delete_account") === "1";
    if (deletion) {
      deletionReturn.current = true;
      setModal("delete-account");
      setPage("ajustes");
    }
    const handleReturnError = () => {
      const message = authReturnError(location.hash, location.search);
      if (!message) return false;
      setAuthNotice(message);
      setModal("auth");
      setPage("descubrir");
      const cleaned = new URL(location.href);
      cleaned.hash = "descubrir";
      for (const key of ["error", "error_code", "error_description"])
        cleaned.searchParams.delete(key);
      window.history.replaceState(
        null,
        "",
        cleaned.pathname + cleaned.search + cleaned.hash,
      );
      return true;
    };
    const change = () => {
      if (!handleReturnError())
        setPage(
          recovery || deletion
            ? "ajustes"
            : routeFromHash(location.hash, routes),
        );
    };
    change();
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (!supabase || !data.user) return;
    void supabase
      .from("saved_filters")
      .select("filters")
      .eq("user_id", data.user.id)
      .maybeSingle()
      .then(({ data: r }) => {
        if (r?.filters) setFilters({ ...initialFilters, ...r.filters });
      });
  }, [data.user]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [data.messages, activeChat]);
  useEffect(() => {
    if (!activeChat || !supabase || !data.user) return;
    void supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", activeChat)
      .eq("user_id", data.user.id);
  }, [activeChat, data.messages.length, data.user]);
  const clubName = (id: string | null) =>
    data.clubs.find((c) => c.id === id)?.name || "Sin club";
  const allProfiles = [data.me, ...data.profiles];
  const visible = useMemo(
    () =>
      data.profiles
        .filter(
          (p) =>
            (tab === "Favoritos" || !data.decided.includes(p.id)) &&
            matchesFilters(p, filters, data.me) &&
            p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
            (tab !== "Favoritos" || data.favorites.includes(p.id)),
        )
        .sort(
          (a, b) =>
            compatibility(data.me, b).score - compatibility(data.me, a).score,
        ),
    [
      data.profiles,
      data.decided,
      data.me,
      data.favorites,
      filters,
      search,
      tab,
    ],
  );
  const activeFilterCount = Object.keys(filters).filter(
    (k) => filters[k as keyof Filters] !== initialFilters[k as keyof Filters],
  ).length;
  const unread = data.notifications.filter((n) => !n.read).length;
  const unreadMessages = data.messages.filter((m) => {
    const c = data.conversations.find((c) => c.id === m.conversation_id);
    const member = c?.conversation_members.find(
      (x) => x.user_id === data.user?.id,
    );
    return (
      m.sender_id !== data.user?.id &&
      member &&
      m.created_at > member.last_read_at
    );
  }).length;
  const hasAuth = !!data.user || data.demo;
  function close() {
    if (
      ["profile", "profile-unavailable"].includes(modal || "") ||
      (!data.user && sharedProfileId(location.search))
    ) {
      const url = new URL(location.href);
      url.searchParams.delete("golfista");
      window.history.replaceState(
        null,
        "",
        url.pathname + url.search + url.hash,
      );
    }
    if (modal === "delete-account") {
      deletionReturn.current = false;
      const url = new URL(location.href);
      url.searchParams.delete("delete_account");
      window.history.replaceState(
        null,
        "",
        url.pathname + url.search + url.hash,
      );
    }
    if (!data.user && !data.demo && requiresAccount(page)) {
      setPage(lastPublicPage.current);
      window.history.replaceState(null, "", "#" + lastPublicPage.current);
    }
    setModal(null);
    setSelected(null);
    setReviewTarget(null);
  }
  function openProfile(p: Profile) {
    if (!data.user && !data.demo) {
      requireAccount("perfil");
      return;
    }
    setSelected(p);
    setProfileTab("Información");
    setModal("profile");
  }
  function score() {
    if (!data.user && !data.demo) {
      requireAccount("scores");
      return;
    }
    setRound(undefined);
    setModal("score");
  }
  function conversationGame(c?: (typeof data.conversations)[number]) {
    return c?.game || data.games.find((g) => g.id === c?.game_id);
  }
  function conversationName(c?: (typeof data.conversations)[number]) {
    if (!c) return "Conversación no disponible";
    return c.game_id
      ? `Party · ${clubName(conversationGame(c)?.club_id || null)}`
      : allProfiles.find(
          (p) =>
            p.id ===
            c.conversation_members.find((m) => m.user_id !== data.user?.id)
              ?.user_id,
        )?.name || "Tu match";
  }
  function selectChat(id: string) {
    if (activeChat !== id) setMessage("");
    setActiveChat(id);
  }
  const currentChat = data.conversations.find((c) => c.id === activeChat);
  const currentChatGame = conversationGame(currentChat);
  const selectedGameId = game?.id;
  useEffect(() => {
    if (modal !== "game" || !selectedGameId || !supabase || !data.user) return;
    let current = true;
    const loaded = data.games.find((g) => g.id === selectedGameId);
    if (loaded) setGame(loaded);
    async function refreshDetails() {
      if (document.hidden) return;
      const result = await supabase!
        .from("games")
        .select("*,participants:game_participants(user_id,status)")
        .eq("id", selectedGameId)
        .maybeSingle();
      if (!current || result.error) return;
      if (result.data) setGame(result.data as Game);
      else {
        setGame(null);
        setModal(null);
        data.notify("Esta partida ya no está disponible.");
      }
    }
    void refreshDetails();
    const timer = setInterval(() => void refreshDetails(), 15000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [modal, selectedGameId, data.user?.id, data.games, data.notify]);
  const currentGame = game;
  return (
    <div className="app-shell">
      <aside className={cn("sidebar", mobileOpen && "open")}>
        <a className="brand" href="#descubrir" onClick={() => go("descubrir")}>
          <span className="brand-mark">
            <Flag size={26} strokeWidth={1.6} />
          </span>
          fairway<span className="brand-dot">.</span>
        </a>
        <div className="sidebar-city">
          <MapPin size={14} />
          León, Guanajuato
          <span className="live-dot" />
        </div>
        <span className="nav-caption">TU COMUNIDAD DE GOLF</span>
        <nav aria-label="Navegación principal">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={cn("nav-item", page === id && "active")}
              onClick={() => go(id)}
            >
              <Icon size={20} strokeWidth={1.7} />
              <span>{label}</span>
              {id === "mensajes" && unreadMessages > 0 && (
                <span className="count">{unreadMessages}</span>
              )}
              {id === "amigos" &&
                friends.relations.some(
                  (r) =>
                    r.status === "pending" && r.recipient_id === data.user?.id,
                ) && (
                  <span className="count">
                    {
                      friends.relations.filter(
                        (r) =>
                          r.status === "pending" &&
                          r.recipient_id === data.user?.id,
                      ).length
                    }
                  </span>
                )}
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="nav-divider" />
        <span className="nav-caption">MI JUEGO</span>
        <nav aria-label="Mi juego">
          {extras.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={cn("nav-item", page === id && "active")}
              onClick={() => go(id)}
            >
              <Icon size={19} strokeWidth={1.7} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-promo">
          <span className="mini-sun">
            <Sun size={23} strokeWidth={1.4} />
          </span>
          <h3>¿Quién juega hoy?</h3>
          <p>
            Hay una buena ronda
            <br />
            esperándote.
          </p>
          <button onClick={() => go("hoy")}>
            Encuentra compañía
            <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() =>
              go(data.user || data.demo ? "ajustes" : "privacidad")
            }
          >
            <SettingsIcon size={18} />
            {data.user || data.demo ? "Ajustes y privacidad" : "Privacidad"}
          </button>
          {data.user && (
            <button className="nav-item" onClick={() => void logout()}>
              <LogOut size={18} />
              Cerrar sesión
            </button>
          )}
          {data.admin && (
            <button className="nav-item" onClick={() => go("admin")}>
              <ShieldCheck size={18} />
              Administración
            </button>
          )}
          <button
            className="sidebar-user"
            onClick={() => (hasAuth ? go("perfil") : openAuth())}
          >
            <Avatar profile={data.me} />
            <span>
              <strong>
                {data.demo
                  ? "Alejandro Torres"
                  : data.user
                    ? data.me.name
                    : "Bienvenido a Fairway"}
              </strong>
              <small>
                {data.demo
                  ? "Perfil de demostración"
                  : data.user
                    ? "Ver mi perfil"
                    : "Inicia sesión"}
              </small>
            </span>
            <ChevronRight size={15} />
          </button>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label="Abrir menú"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span>Mi comunidad</span>
            <ChevronRight size={13} />
            <strong>
              {
                [
                  ...navigation,
                  ...extras,
                  { id: "ajustes", label: "Ajustes" },
                  { id: "hoy", label: "¿Quién juega hoy?" },
                  { id: "admin", label: "Administración" },
                  { id: "inicio", label: "Bienvenido" },
                  { id: "privacidad", label: "Privacidad" },
                ].find((n) => n.id === page)?.label
              }
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="location">
              <MapPin size={14} />
              León, Gto.
            </span>
            <button
              className="notification-button icon-btn"
              aria-label={`Notificaciones, ${unread} sin leer`}
              onClick={() =>
                data.user || data.demo
                  ? setModal("notifications")
                  : requireAccount("notificaciones")
              }
            >
              <Bell size={19} />
              {unread > 0 && <i />}
            </button>
            <div className="topbar-divider" />
            {data.user ? (
              <details className="account-menu">
                <summary aria-label="Opciones de mi cuenta">
                  <Avatar profile={data.me} />
                  <span>Mi cuenta</span>
                  <ChevronDown size={14} />
                </summary>
                <div className="account-menu-items">
                  <strong>{data.me.name}</strong>
                  <button
                    onClick={(e) => {
                      e.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                      go("perfil");
                    }}
                  >
                    <UserRound size={16} />
                    Mi perfil
                  </button>
                  <button
                    onClick={(e) => {
                      e.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                      go("ajustes");
                    }}
                  >
                    <SettingsIcon size={16} />
                    Ajustes y privacidad
                  </button>
                  <button
                    onClick={(e) => {
                      e.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                      void logout();
                    }}
                  >
                    <LogOut size={16} />
                    Cerrar sesión
                  </button>
                  <button
                    className="account-menu-delete"
                    onClick={(e) => {
                      e.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                      setModal("delete-account");
                    }}
                  >
                    <Trash2 size={16} />
                    Eliminar mi cuenta
                  </button>
                </div>
              </details>
            ) : data.demo ? (
              <span className="demo-pill">Vista demo</span>
            ) : (
              <Button variant="outline" onClick={() => openAuth()}>
                Iniciar sesión
              </Button>
            )}
          </div>
        </header>
        <main>
          {data.demo && (
            <div className="demo-notice">
              <span>
                <span className="live-dot" />
                Explora Fairway · Perfiles, partidas y scores de demostración
              </span>
              <button onClick={() => setModal("connection")}>
                Conectar mi comunidad
                <ArrowUpRight size={13} />
              </button>
            </div>
          )}
          {data.error && (
            <div role="alert" className="error-banner">
              {data.error}
              <button onClick={() => void data.reload()}>Reintentar</button>
            </div>
          )}
          {data.loading ? (
            <div className="loading-state">
              <div className="skeleton heading-skeleton" />
              <div className="skeleton hero-skeleton" />
              <div className="profile-grid">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton card-skeleton" />
                ))}
              </div>
            </div>
          ) : !hasAuth ? (
            <>
              {page === "inicio" && (
                <Welcome onAuth={() => openAuth("signup")} />
              )}
              {page === "descubrir" && (
                <GuestDiscover
                  onClubs={() => go("clubes")}
                  onAccount={() => requireAccount("perfil")}
                />
              )}
              {page === "clubes" && (
                <ClubDirectory
                  clubs={data.clubs}
                  guest
                  live={data.publicDirectoryLive}
                  onPlayers={() => requireAccount("perfil")}
                />
              )}
              {page === "privacidad" && <PublicPrivacy />}
              {requiresAccount(page) && (
                <LockedPreview
                  feature={page}
                  onAccount={() => requireAccount(page)}
                  onClubs={() => go("clubes")}
                />
              )}
            </>
          ) : (
            <>
              {page === "inicio" && (
                <Welcome onAuth={() => openAuth("signup")} />
              )}
              {page === "descubrir" && (
                <>
                  <SectionHeading
                    eyebrow="MEJOR GOLF. MEJOR COMPAÑÍA."
                    title="Encuentra tu próximo foursome."
                    description="Conecta con golfistas que comparten tu ritmo, tu nivel y tu pasión."
                    action={
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDraftFilters(filters);
                          setModal("filters");
                        }}
                      >
                        <SlidersHorizontal size={16} />
                        Filtros
                        {activeFilterCount > 0 && (
                          <span className="filter-count">
                            {activeFilterCount}
                          </span>
                        )}
                      </Button>
                    }
                  />
                  <section className="golf-hero">
                    <div className="hero-image" />
                    <div className="hero-content">
                      <span className="hero-eyebrow">
                        <span className="live-dot" />
                        EL GOLF SE DISFRUTA MÁS EN COMPAÑÍA
                      </span>
                      <h2>
                        El siguiente gran encuentro
                        <br />
                        puede ser en el green.
                      </h2>
                      <p>Tu comunidad de golf, aquí en León.</p>
                      <button onClick={() => go("partidas")}>
                        Explorar partidas
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                    <div className="hero-stamp">
                      <Flag size={23} strokeWidth={1.2} />
                      <span>
                        GOOD GOLF.
                        <br />
                        GREAT COMPANY.
                      </span>
                    </div>
                  </section>
                  <div className="discover-toolbar">
                    <div className="tabs">
                      <button
                        onClick={() => setTab("Para ti")}
                        className={tab === "Para ti" ? "active" : ""}
                      >
                        Para ti<span>{visible.length}</span>
                      </button>
                      <button
                        onClick={() => setTab("Favoritos")}
                        className={tab === "Favoritos" ? "active" : ""}
                      >
                        Favoritos
                        <Bookmark size={13} />
                      </button>
                      <button
                        onClick={() => {
                          go("mensajes");
                        }}
                      >
                        Mis matches
                      </button>
                    </div>
                    <label className="search-input">
                      <Search size={16} />
                      <input
                        aria-label="Buscar golfista"
                        placeholder="Buscar golfista"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="discovery-subline">
                    <p>
                      <span className="live-dot" />
                      {tab === "Favoritos"
                        ? "Tus compañeros guardados"
                        : "Personas con las que vale la pena compartir 18 hoyos"}
                    </p>
                    <span>
                      Ordenados por compatibilidad
                      <ChevronDown size={13} />
                    </span>
                  </div>
                  <div className="profile-grid">
                    {visible.slice(0, 6).map((p) => (
                      <ProfileCard
                        key={p.id}
                        profile={p}
                        me={data.me}
                        club={clubName(p.club_id)}
                        favorite={data.favorites.includes(p.id)}
                        onOpen={() => openProfile(p)}
                        onLike={() => void data.decide(p.id, "like")}
                        onPass={() => void data.decide(p.id, "pass")}
                        onFavorite={() => void data.favorite(p.id)}
                      />
                    ))}
                  </div>
                  {visible.length === 0 && (
                    <Empty
                      title={
                        tab === "Favoritos"
                          ? "Tu próximo compañero favorito está por llegar"
                          : "Llegaste al final del fairway"
                      }
                      description="Prueba con otros filtros o vuelve más tarde para descubrir nuevos golfistas."
                      action={
                        <Button
                          variant="outline"
                          onClick={() => {
                            setFilters(initialFilters);
                            setSearch("");
                            setTab("Para ti");
                          }}
                        >
                          Restablecer filtros
                        </Button>
                      }
                    />
                  )}
                  <div className="discovery-footnote">
                    <ShieldCheck size={14} />
                    <span>
                      La compatibilidad se basa en club, disponibilidad,
                      modalidad, handicap y estilo de juego.
                    </span>
                    <button onClick={() => setModal("compatibility")}>
                      ¿Cómo funciona?
                    </button>
                  </div>
                  <div className="next-section-heading">
                    <div>
                      <span className="eyebrow">HAZ ESPACIO EN TU AGENDA</span>
                      <h2>El green te está esperando</h2>
                    </div>
                    <InlineLink onClick={() => go("partidas")}>
                      Ver todas las partidas
                    </InlineLink>
                  </div>
                  <div className="game-grid">
                    {data.games
                      .filter((g) => g.status === "open" && gameIsUpcoming(g))
                      .slice(0, 2)
                      .map((g) => (
                        <GameCard
                          key={g.id}
                          game={g}
                          club={clubName(g.club_id)}
                          onOpen={() => {
                            setGame(g);
                            setModal("game");
                          }}
                        />
                      ))}
                  </div>
                </>
              )}
              {page === "partidas" && (
                <Parties
                  data={data}
                  calendarDate={partyCalendarDate}
                  onCalendarDateChange={setPartyCalendarDate}
                  onCreate={(date) => {
                    setPartyDate(date);
                    setModal("create-party");
                  }}
                  onOpen={(g) => {
                    setGame(g);
                    setModal("game");
                  }}
                />
              )}
              {page === "mensajes" && (
                <>
                  <SectionHeading
                    eyebrow="DEL MATCH AL TEE"
                    title="Buenas conversaciones. Mejores rondas."
                    description="Conversa con tus matches y con los participantes de tus partidas."
                  />
                  <div className="chat-layout">
                    <aside className="chat-sidebar">
                      <h3>
                        Mis conversaciones{" "}
                        <span>{data.conversations.length}</span>
                      </h3>
                      {data.conversations.map((c) => {
                        const last = data.messages
                          .filter((m) => m.conversation_id === c.id)
                          .at(-1);
                        return (
                          <button
                            key={c.id}
                            onClick={() => selectChat(c.id)}
                            className={cn(
                              "chat-contact",
                              activeChat === c.id && "active",
                            )}
                          >
                            <div
                              className={`avatar ${c.game_id ? "party-chat-avatar" : ""}`}
                            >
                              {c.game_id ? (
                                <Users size={19} />
                              ) : (
                                conversationName(c)[0]
                              )}
                            </div>
                            <div>
                              <strong>{conversationName(c)}</strong>
                              {c.game_id && (
                                <span className="chat-contact-group-meta">
                                  {conversationGame(c)
                                    ? `${dateFormat(conversationGame(c)!.starts_at)} · `
                                    : ""}
                                  {c.conversation_members.length} participantes
                                </span>
                              )}
                              <small>
                                {last?.body ||
                                  (c.game_id
                                    ? "Tu grupo ya tiene un espacio para coordinarse."
                                    : "Empieza la conversación")}
                              </small>
                            </div>
                          </button>
                        );
                      })}
                      {!data.conversations.length && (
                        <p className="muted padded">
                          Un match mutuo o una partida confirmada abre una
                          conversación.
                        </p>
                      )}
                    </aside>
                    <section className="chat-main">
                      {currentChat ? (
                        <>
                          <div className="chat-title">
                            <strong>{conversationName(currentChat)}</strong>
                            {currentChatGame && (
                              <small className="party-chat-date">
                                <CalendarDays size={13} />
                                {dateFormat(currentChatGame.starts_at)} ·{" "}
                                {timeFormat(currentChatGame.starts_at)} ·{" "}
                                {currentChatGame.holes} hoyos
                              </small>
                            )}
                            <span>
                              {currentChat.game_id ? (
                                <Users size={14} />
                              ) : (
                                <ShieldCheck size={14} />
                              )}{" "}
                              {currentChat.game_id
                                ? `${currentChat.conversation_members.length} participantes confirmados · Chat privado`
                                : "Conversación con consentimiento"}
                            </span>
                            {currentChat.game_id && (
                              <div
                                className="party-chat-roster"
                                aria-label="Participantes del chat"
                              >
                                {currentChat.conversation_members.map(
                                  (member) => (
                                    <span key={member.user_id}>
                                      {member.user_id === data.user?.id
                                        ? "Tú"
                                        : allProfiles.find(
                                            (p) => p.id === member.user_id,
                                          )?.name || "Golfista"}
                                    </span>
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                          <div className="chat-messages">
                            {currentChat.game_id &&
                              !data.messages.some(
                                (m) => m.conversation_id === activeChat,
                              ) && (
                                <div className="party-chat-empty">
                                  <span>
                                    <MessageCircle
                                      size={29}
                                      strokeWidth={1.4}
                                    />
                                  </span>
                                  <strong>
                                    El chat de tu party ya está listo.
                                  </strong>
                                  <p>
                                    Aquí pueden coordinar la hora de encuentro y
                                    los detalles de la ronda. Los jugadores
                                    confirmados se incorporan automáticamente.
                                  </p>
                                </div>
                              )}
                            {data.messages
                              .filter((m) => m.conversation_id === activeChat)
                              .map((m) => (
                                <div
                                  className={cn(
                                    "chat-bubble",
                                    m.sender_id === data.user?.id && "own",
                                  )}
                                  key={m.id}
                                >
                                  {currentChat.game_id && (
                                    <strong className="chat-sender-name">
                                      {m.sender_id === data.user?.id
                                        ? "Tú"
                                        : allProfiles.find(
                                            (p) => p.id === m.sender_id,
                                          )?.name || "Golfista"}
                                    </strong>
                                  )}
                                  {m.body}
                                  <small>{timeFormat(m.created_at)}</small>
                                </div>
                              ))}
                            <div ref={chatEnd} />
                          </div>
                          <form
                            className="chat-input"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!message.trim() || busy) return;
                              setBusy(true);
                              const ok = await data.run(() =>
                                supabase!.rpc("send_message", {
                                  c: activeChat,
                                  content: message,
                                }),
                              );
                              if (ok) setMessage("");
                              setBusy(false);
                            }}
                          >
                            <input
                              aria-label="Mensaje"
                              placeholder="¿A qué hora nos vemos en el tee?"
                              maxLength={2000}
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                            />
                            <Button
                              disabled={busy || !message.trim()}
                              aria-label="Enviar mensaje"
                            >
                              <Send size={18} />
                            </Button>
                          </form>
                        </>
                      ) : (
                        <Empty
                          title="El inicio de una buena ronda"
                          description={
                            data.demo
                              ? "Conecta Supabase para activar matches y mensajes reales. Aquí no se simulan conversaciones."
                              : "Elige una conversación para empezar a organizar tu próximo encuentro."
                          }
                        />
                      )}
                    </section>
                  </div>
                </>
              )}
              {page === "perfil" && (
                <>
                  <SectionHeading
                    eyebrow="ESTE ES TU JUEGO"
                    title="Mi perfil de golfista"
                    action={
                      <div className="button-row profile-header-actions">
                        <Button
                          variant="outline"
                          onClick={() => setModal("profile-qr")}
                        >
                          <QrCode size={17} />
                          Mi código QR
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setModal("edit-profile")}
                        >
                          Editar perfil
                          <ArrowUpRight size={16} />
                        </Button>
                      </div>
                    }
                  />
                  <div className="profile-cover">
                    <div className="profile-cover-photo" />
                    <div className="profile-cover-content">
                      <Avatar profile={data.me} large />
                      <div>
                        <h2>
                          {data.me.name}
                          <span>{data.me.age}</span>
                        </h2>
                        <p>
                          <MapPin size={14} />
                          {data.me.city} · {clubName(data.me.club_id)}
                        </p>
                        <span className="badge">Membresía declarada</span>
                      </div>
                      <div className="profile-hcp">
                        <span>HANDICAP DECLARADO</span>
                        <strong>{data.me.handicap ?? "—"}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="profile-friends-link panel">
                    <Users size={21} />
                    <div>
                      <strong>El golf, con tus amigos</strong>
                      <p>
                        Busca personas, revisa solicitudes y arma tu círculo.
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => go("amigos")}>
                      Ver mis amigos
                      <ArrowUpRight size={16} />
                    </Button>
                  </div>
                  <div className="tabs spaced">
                    {[
                      "Publicaciones",
                      "Scores",
                      "Estadísticas",
                      "Información",
                    ].map((t) => (
                      <button
                        key={t}
                        className={profileTab === t ? "active" : ""}
                        onClick={() => setProfileTab(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {profileTab === "Estadísticas" ? (
                    <Stats data={data} />
                  ) : profileTab === "Scores" ? (
                    <Rounds
                      data={data}
                      onEdit={(r) => {
                        setRound(r);
                        setModal("score");
                      }}
                      onNew={score}
                    />
                  ) : profileTab === "Publicaciones" ? (
                    <Community data={data} />
                  ) : (
                    <div className="panel profile-info">
                      <Gallery paths={data.me.gallery || []} />
                      <h3>Sobre mí</h3>
                      <p>
                        {data.me.bio ||
                          "Cuéntale a la comunidad qué disfrutas del golf."}
                      </p>
                      <div className="info-grid">
                        <InfoItem
                          label="Disponibilidad"
                          value={
                            data.me.availability.join(", ") || "Por definir"
                          }
                        />
                        <InfoItem
                          label="Modalidad"
                          value={`${data.me.holes} hoyos`}
                        />
                        <InfoItem label="Estilo" value={data.me.style} />
                        <InfoItem
                          label="Handicap"
                          value={
                            data.me.handicap === null
                              ? "Sin handicap"
                              : String(data.me.handicap)
                          }
                        />
                        <InfoItem
                          label="Mano dominante"
                          value={data.me.hand || "Por definir"}
                        />
                        <InfoItem
                          label="Rondas registradas"
                          value={String(
                            data.rounds.filter((r) => r.status !== "draft")
                              .length,
                          )}
                        />
                      </div>
                      <h3>Logros de tu juego</h3>
                      <div className="chips">
                        {data.rounds.some((r) => r.status !== "draft") ? (
                          <span className="badge gold">
                            <Flag size={13} />
                            Primera ronda registrada
                          </span>
                        ) : (
                          <span className="muted">
                            Tu primera ronda desbloqueará tu primer logro.
                          </span>
                        )}
                        {data.rounds.filter((r) => r.status !== "draft")
                          .length >= 10 && (
                          <span className="badge gold">10 rondas jugadas</span>
                        )}
                        {data.rounds.some(
                          (r) => summarize(r.scores).birdies > 0,
                        ) && (
                          <span className="badge gold">
                            Primer birdie registrado
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              {page === "scores" && (
                <>
                  <SectionHeading
                    eyebrow="CADA GOLPE CUENTA"
                    title="La historia de tu juego."
                    description="Guarda tus rondas, celebra tus mejores scores y sigue mejorando."
                    action={
                      <Button onClick={score}>
                        <Plus size={17} />
                        Registrar score
                      </Button>
                    }
                  />
                  <Rounds
                    data={data}
                    onEdit={(r) => {
                      setRound(r);
                      setModal("score");
                    }}
                    onNew={score}
                  />
                </>
              )}
              {page === "estadisticas" && (
                <>
                  <SectionHeading
                    eyebrow="UN POCO MEJOR, CADA RONDA"
                    title="Tu juego en números."
                    description="El progreso está en los detalles. Descubre los tuyos."
                    action={
                      <Button onClick={score}>
                        <Plus size={16} />
                        Registrar score
                      </Button>
                    }
                  />
                  <Stats data={data} />
                </>
              )}
              {page === "comunidad" && (
                <>
                  <SectionHeading
                    eyebrow="MÁS ALLÁ DEL HOYO 18"
                    title="Historias que se comparten."
                    description="Logros, rondas y conversaciones de tu comunidad de golf."
                  />
                  <Community data={data} />
                </>
              )}
              {page === "amigos" && (
                <Friends
                  data={data}
                  friends={friends}
                  onProfile={openProfile}
                />
              )}
              {page === "clubes" && (
                <ClubDirectory
                  clubs={data.clubs}
                  profiles={[data.me, ...data.profiles]}
                  onPlayers={(id) => {
                    setFilters({ ...initialFilters, club: id });
                    go("descubrir");
                  }}
                />
              )}
              {page === "privacidad" && <PublicPrivacy />}
              {page === "hoy" && (
                <Availability
                  data={data}
                  openProfile={openProfile}
                  onCreate={() => setModal("create-game")}
                />
              )}
              {page === "ajustes" && (
                <>
                  <SectionHeading
                    eyebrow="TU ESPACIO"
                    title="Ajustes y privacidad"
                  />
                  <Settings
                    data={data}
                    onEdit={() => setModal("edit-profile")}
                    onLogout={() => void logout()}
                    onDelete={() => setModal("delete-account")}
                  />
                </>
              )}
              {page === "admin" && (
                <>
                  <SectionHeading
                    eyebrow="FAIRWAY ADMIN"
                    title="Administrar la comunidad"
                  />
                  <Admin data={data} />
                </>
              )}
            </>
          )}
          <footer className="app-footer">
            <a href="#inicio" onClick={() => go("inicio")}>
              fairway.
            </a>
            <span>El golf conecta.</span>
            <button onClick={() => go("privacidad")}>Privacidad</button>
            <span>Hecho para compartir el juego.</span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {navigation
          .filter(({ id }) => id !== "comunidad")
          .map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => go(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
      </nav>
      {data.toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {data.toast}
          <button aria-label="Cerrar aviso" onClick={() => data.notify("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {modal === "account-required" && (
        <AccountRequired
          feature={gateFeature}
          onClose={close}
          onLogin={() => openAuth("login")}
          onSignup={() => openAuth("signup")}
        />
      )}
      {modal === "profile-qr" && (
        <ProfileQR profile={data.me} onClose={close} />
      )}
      {modal === "profile-unavailable" && (
        <Modal title="Perfil no disponible" onClose={close} soft>
          <p>
            No podemos mostrar este perfil. Puede ser privado, no estar
            disponible o no permitir el acceso desde tu cuenta.
          </p>
          <Button onClick={close}>Volver a explorar</Button>
        </Modal>
      )}
      {modal === "delete-account" && !data.user && !data.loading && (
        <AccountRequired
          feature="ajustes"
          onClose={close}
          onLogin={() => openAuth("login")}
          onSignup={() => openAuth("signup")}
        />
      )}
      {modal === "delete-account" && data.user && (
        <DeleteAccountDialog
          data={data}
          onClose={close}
          onDeleted={() => {
            deletionReturn.current = false;
            close();
            go("inicio");
            window.history.replaceState(
              null,
              "",
              location.pathname + "#inicio",
            );
          }}
        />
      )}
      {modal === "auth" && (
        <Modal
          title={
            authMode === "signup"
              ? "Crea tu cuenta en Fairway"
              : "Bienvenido a Fairway"
          }
          onClose={close}
          soft
        >
          <AuthForm
            data={data}
            initialMessage={authNotice}
            initialMode={authMode}
            onDone={() => {
              setAuthNotice("");
              setModal(null);
              setSelected(null);
              setReviewTarget(null);
              if (!requiresAccount(page)) go("perfil");
            }}
          />
        </Modal>
      )}
      {modal === "edit-profile" && (
        <Modal title="Tu perfil de golfista" onClose={close} wide>
          <ProfileForm data={data} onDone={close} />
        </Modal>
      )}
      {(modal === "create-game" || modal === "create-party") && (
        <Modal
          title={
            modal === "create-party"
              ? "Arma tu próxima party"
              : "Arma tu próxima partida"
          }
          onClose={close}
        >
          <GameForm
            party={modal === "create-party"}
            initialDate={modal === "create-party" ? partyDate : undefined}
            data={data}
            onDone={async (date, gameId) => {
              setPartyCalendarDate(date);
              close();
              const chatId = await data.partyChat(gameId);
              if (chatId) {
                selectChat(chatId);
                go("mensajes");
              } else go("partidas");
            }}
          />
        </Modal>
      )}
      {modal === "score" && (
        <Modal
          title={round ? "Editar scorecard" : "Registra una nueva ronda"}
          onClose={close}
          wide
        >
          <Scorecard
            data={data}
            round={round}
            onDone={() => {
              close();
              go("scores");
            }}
          />
        </Modal>
      )}
      {modal === "filters" && (
        <Modal title="Encuentra tu tipo de golf" onClose={close}>
          <FilterForm
            filters={draftFilters}
            setFilters={setDraftFilters}
            clubs={data.clubs}
            onSave={async () => {
              setFilters(draftFilters);
              close();
              if (supabase && data.user) {
                const { error } = await supabase
                  .from("saved_filters")
                  .upsert({ user_id: data.user.id, filters: draftFilters });
                if (error)
                  data.notify(
                    "Filtros aplicados. No se pudieron guardar: " +
                      error.message,
                  );
              } else if (data.demo)
                data.notify(
                  "Filtros aplicados a los perfiles de demostración.",
                );
            }}
            onReset={() => setDraftFilters(initialFilters)}
          />
        </Modal>
      )}
      {modal === "compatibility" && (
        <Modal title="Compatibilidad, sin misterio" onClose={close}>
          <p className="form-intro">
            Un cálculo determinista de 0 a 100, basado en lo que cada persona
            declara.
          </p>
          <div className="compatibility-rules">
            {[
              ["Mismo club", "30 puntos"],
              ["Al menos un día en común", "30 puntos"],
              ["Misma modalidad (9 o 18 hoyos)", "20 puntos"],
              ["Handicaps a 8 puntos o menos", "10 puntos"],
              ["Mismo estilo de juego", "10 puntos"],
            ].map(([a, b]) => (
              <div className="list-row" key={a}>
                <span>{a}</span>
                <strong>{b}</strong>
              </div>
            ))}
          </div>
          <p className="muted">
            Sin handicap declarado no se suman los 10 puntos de cercanía de
            handicap. La compatibilidad no garantiza acceso al club.
          </p>
        </Modal>
      )}
      {modal === "profile" && selected && (
        <Modal title="Conoce a tu próximo compañero" onClose={close}>
          <img
            src={selected.photo || "/images/avatar.svg"}
            alt={selected.name}
            className="full-profile-photo"
          />
          <Gallery paths={selected.gallery || []} />
          <div className="full-profile-heading">
            <div>
              <h2>
                {selected.name}, {selected.age}
              </h2>
              <p>
                {clubName(selected.club_id)} · {selected.city}
              </p>
            </div>
            <span className="compatibility-badge">
              {compatibility(data.me, selected).score}% compatible
            </span>
          </div>
          <p>{selected.bio}</p>
          <div className="info-grid">
            <InfoItem
              label="Handicap declarado"
              value={
                selected.handicap === null
                  ? "Sin handicap"
                  : String(selected.handicap)
              }
            />
            <InfoItem
              label="Disponibilidad"
              value={selected.availability.join(", ")}
            />
            <InfoItem label="Modalidad" value={`${selected.holes} hoyos`} />
            <InfoItem label="Membresía" value="Declarada · no verificada" />
          </div>
          <div className="compatibility-reasons">
            {compatibility(data.me, selected).reasons.map((r) => (
              <span key={r}>
                <Check size={14} />
                {r}
              </span>
            ))}
          </div>
          <p className="muted">
            {selected.review_count
              ? `${selected.rating} / 5 · ${selected.review_count} evaluaciones como compañero`
              : "Aún no tiene evaluaciones."}
          </p>
          <div className="button-row">
            <FriendshipActions
              personId={selected.id}
              friends={friends}
              userId={data.user?.id || data.me.id}
            />
          </div>
          <div className="button-row">
            <Button
              onClick={() => {
                void data.decide(selected.id, "like");
                close();
              }}
            >
              <Heart size={17} />
              Me gustaría jugar
            </Button>
            <Button
              variant="outline"
              onClick={() => void data.favorite(selected.id)}
            >
              <Bookmark size={16} />
              {data.favorites.includes(selected.id) ? "Guardado" : "Guardar"}
            </Button>
          </div>
          <div className="safety-actions">
            <button
              onClick={async () => {
                const ok = await data.run(
                  () =>
                    supabase!.from("blocks").insert({
                      user_id: data.user!.id,
                      target_id: selected.id,
                    }),
                  "Usuario bloqueado.",
                );
                if (ok) {
                  void friends.refresh();
                  close();
                }
              }}
            >
              Bloquear usuario
            </button>
            <button
              onClick={async () => {
                const reason = window.prompt(
                  "Describe el motivo del reporte (mínimo 5 caracteres):",
                );
                if (reason && reason.length >= 5)
                  await data.run(
                    () =>
                      supabase!.from("reports").insert({
                        user_id: data.user!.id,
                        target_id: selected.id,
                        reason,
                      }),
                    "Reporte enviado para revisión.",
                  );
              }}
            >
              Reportar perfil
            </button>
          </div>
        </Modal>
      )}
      {modal === "game" && currentGame && (
        <Modal title="Nos vemos en el tee" onClose={close}>
          <div className="game-detail-hero">
            <Flag size={24} />
            <h2>{clubName(currentGame.club_id)}</h2>
            <p>
              {dateFormat(currentGame.starts_at)} ·{" "}
              {timeFormat(currentGame.starts_at)} · {currentGame.holes} hoyos
            </p>
          </div>
          <div className="chips">
            <span className="badge">
              {currentGame.join_mode === "open"
                ? "Party abierta · unión directa"
                : "Con aprobación"}
            </span>
            <span className="badge">{currentGame.format}</span>
            <span className="badge">{currentGame.kind}</span>
            <span className="badge">{statusLabel(currentGame.status)}</span>
          </div>
          <p>{currentGame.description}</p>
          <div className="notice">
            <Info size={17} />
            {currentGame.access_conditions}
          </div>
          <GameJoinActions
            key={currentGame.id}
            game={currentGame}
            data={data}
            onChat={(id) => {
              selectChat(id);
              close();
              go("mensajes");
            }}
          />
          <h3>Jugadores confirmados</h3>
          {currentGame.participants
            ?.filter((p) => p.status === "confirmed")
            .map((p) => (
              <div className="list-row" key={p.user_id}>
                <span>
                  {allProfiles.find((u) => u.id === p.user_id)?.name ||
                    "Golfista"}
                </span>
                <span className="badge">Confirmado</span>
              </div>
            ))}
          {currentGame.host_id === data.user?.id ? (
            <>
              <form
                className="form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await data.run(
                    () =>
                      supabase!.rpc("invite_to_game", {
                        g: currentGame.id,
                        invitee: fd.get("invitee"),
                      }),
                    "Invitación enviada. La persona debe aceptarla y confirmar acceso.",
                  );
                }}
              >
                <Field label="Invitar a un golfista">
                  <select name="invitee" required>
                    {data.profiles.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Button variant="outline">Enviar invitación</Button>
              </form>
              <h3>Solicitudes pendientes</h3>
              {currentGame.participants
                ?.filter((p) => p.status === "requested")
                .map((p) => (
                  <div className="list-row" key={p.user_id}>
                    <span>
                      {allProfiles.find((u) => u.id === p.user_id)?.name ||
                        "Golfista"}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() =>
                        void data.run(
                          () =>
                            supabase!.rpc("manage_game", {
                              g: currentGame.id,
                              player: p.user_id,
                              action: "confirmed",
                            }),
                          "Jugador confirmado.",
                        )
                      }
                    >
                      Aprobar
                    </Button>
                    <button
                      className="icon-btn"
                      aria-label="Rechazar solicitud"
                      onClick={() =>
                        void data.run(() =>
                          supabase!.rpc("manage_game", {
                            g: currentGame.id,
                            player: p.user_id,
                            action: "rejected",
                          }),
                        )
                      }
                    >
                      <X size={17} />
                    </button>
                  </div>
                ))}
              <div className="button-row">
                <Button
                  variant="outline"
                  onClick={() =>
                    void data.run(
                      () =>
                        supabase!.rpc("manage_game", {
                          g: currentGame.id,
                          player: data.user!.id,
                          action: "finished",
                        }),
                      "Partida finalizada. Ya pueden evaluarse.",
                    )
                  }
                >
                  Finalizar partida
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    void data.run(
                      () =>
                        supabase!.rpc("manage_game", {
                          g: currentGame.id,
                          player: data.user!.id,
                          action: "cancelled",
                        }),
                      "Partida cancelada.",
                    )
                  }
                >
                  Cancelar partida
                </Button>
              </div>
            </>
          ) : null}

          {currentGame.status === "finished" &&
            currentGame.participants?.some(
              (p) => p.user_id === data.user?.id && p.status === "confirmed",
            ) && (
              <>
                <h3>Califica a tus compañeros</h3>
                {currentGame.participants
                  .filter(
                    (p) =>
                      p.status === "confirmed" && p.user_id !== data.user?.id,
                  )
                  .map((p) => {
                    const target = allProfiles.find((u) => u.id === p.user_id);
                    return (
                      target && (
                        <Button
                          variant="outline"
                          key={p.user_id}
                          onClick={() => {
                            setReviewTarget(target);
                            setModal("review");
                          }}
                        >
                          <Star size={15} />
                          {target.name}
                        </Button>
                      )
                    );
                  })}
              </>
            )}
        </Modal>
      )}
      {modal === "review" && reviewTarget && currentGame && (
        <Modal title="Una buena compañía se reconoce" onClose={close}>
          <ReviewForm
            data={data}
            game={currentGame}
            target={reviewTarget}
            onDone={close}
          />
        </Modal>
      )}
      {modal === "notifications" && (
        <Modal title="Tus notificaciones" onClose={close}>
          {data.notifications.length ? (
            <>
              <Button
                variant="ghost"
                onClick={() =>
                  void data.run(() =>
                    supabase!
                      .from("notifications")
                      .update({ read: true })
                      .eq("user_id", data.user!.id),
                  )
                }
              >
                <CheckCheck size={16} />
                Marcar todas como leídas
              </Button>
              {data.notifications.map((n) => (
                <div
                  className={cn("notification-row", !n.read && "unread")}
                  key={n.id}
                >
                  <Bell size={18} />
                  <div>
                    <strong>{n.title}</strong>
                    <small>{dateFormat(n.created_at)}</small>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <Empty
              title="Todo al día"
              description={
                data.demo
                  ? "Las notificaciones reales se activan al conectar Supabase."
                  : "Aquí verás tus matches, mensajes y novedades."
              }
            />
          )}
        </Modal>
      )}
      {modal === "connection" && (
        <Modal title="Activa tu comunidad real" onClose={close}>
          <p>
            Esta vista usa datos de demostración. Para activar usuarios, base de
            datos y chat:
          </p>
          <ol className="setup-steps">
            <li>
              Crea un proyecto en{" "}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
              >
                Supabase
              </a>
              .
            </li>
            <li>
              Ejecuta los archivos de <code>supabase/migrations</code> en orden
              en el editor SQL.
            </li>
            <li>
              Copia la URL y la clave pública a <code>.env.local</code>. Usa{" "}
              <code>.env.example</code> como guía.
            </li>
            <li>Reinicia o vuelve a desplegar el proyecto.</li>
          </ol>
          <div className="notice">
            Las instrucciones completas están en el README del proyecto. Nunca
            compartas la clave service_role.
          </div>
        </Modal>
      )}
    </div>
  );
}
function Avatar({
  profile,
  large = false,
}: {
  profile: Profile;
  large?: boolean;
}) {
  return (
    <span className={cn("avatar", large && "large")}>
      {profile.photo ? <img src={profile.photo} alt="" /> : profile.name[0]}
    </span>
  );
}
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-item">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
function statusLabel(s: string) {
  return (
    {
      open: "Abierta",
      full: "Completa",
      cancelled: "Cancelada",
      finished: "Finalizada",
    }[s] || s
  );
}
function ProfileCard({
  profile: p,
  me,
  club,
  favorite,
  onOpen,
  onLike,
  onPass,
  onFavorite,
}: {
  profile: Profile;
  me: Profile;
  club: string;
  favorite: boolean;
  onOpen: () => void;
  onLike: () => void;
  onPass: () => void;
  onFavorite: () => void;
}) {
  const match = compatibility(me, p);
  const start = useRef(0);
  return (
    <article
      className="golfer-card"
      onTouchStart={(e) => {
        start.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const delta = e.changedTouches[0].clientX - start.current;
        if (delta > 90) onLike();
        else if (delta < -90) onPass();
      }}
    >
      <div className="golfer-photo">
        <button
          onClick={onOpen}
          aria-label={`Ver perfil de ${p.name}`}
          className="photo-open"
        >
          <img
            src={p.photo || "/images/avatar.svg"}
            alt={p.name}
            loading="lazy"
          />
        </button>
        <span className="match-pill">
          <span className="live-dot" />
          {match.score}% compatible
        </span>
        <button
          className={cn("save-profile", favorite && "saved")}
          aria-label={favorite ? "Quitar de favoritos" : "Guardar perfil"}
          onClick={onFavorite}
        >
          <Bookmark size={17} fill={favorite ? "currentColor" : "none"} />
        </button>
        <div className="photo-gradient" />
        <div className="golfer-name">
          <button onClick={onOpen}>
            {p.name}
            <span>, {p.age}</span>
            {p.verified && <ShieldCheck size={18} />}
          </button>
          <span>
            <MapPin size={12} />
            {p.city}, Gto.
          </span>
        </div>
      </div>
      <div className="golfer-details">
        <div className="golfer-meta">
          <span className="handicap-chip">
            HCP <strong>{p.handicap ?? "S/H"}</strong>
          </span>
          <span className="rating">
            <Star size={12} fill="currentColor" />
            {p.review_count ? p.rating : "—"}
            <small>{p.review_count ? `(${p.review_count})` : ""}</small>
          </span>
        </div>
        <p className="golfer-club">
          <Flag size={13} />
          {club}
        </p>
        <p className="golfer-bio">{p.bio}</p>
        <div className="golfer-tags">
          <span>
            <CalendarDays size={12} />
            {p.availability.includes("Sábado") &&
            p.availability.includes("Domingo")
              ? "Fines de semana"
              : p.availability.slice(0, 2).join(" y ")}
          </span>
          <span>
            <Target size={12} />
            {p.holes} hoyos
          </span>
        </div>
        <div className="golfer-actions">
          <button
            className="pass-button"
            onClick={onPass}
            aria-label={`Pasar a ${p.name}`}
          >
            <X size={21} />
          </button>
          <button className="profile-info-button" onClick={onOpen}>
            Ver perfil
            <ArrowUpRight size={13} />
          </button>
          <button
            className="like-button"
            onClick={onLike}
            aria-label={`Dar like a ${p.name}`}
          >
            <Heart size={22} />
          </button>
        </div>
      </div>
    </article>
  );
}
function GameCard({
  game: g,
  club,
  onOpen,
}: {
  game: Game;
  club: string;
  onOpen: () => void;
}) {
  const confirmed =
    g.participants?.filter((p) => p.status === "confirmed").length || 1;
  return (
    <article className="game-card">
      <div className="game-icon">
        <Flag size={23} strokeWidth={1.5} />
      </div>
      <div className="game-card-content">
        <div className="game-card-top">
          <span className="eyebrow">
            {g.status === "open"
              ? `BUSCAMOS ${g.capacity - confirmed} ${g.capacity - confirmed === 1 ? "JUGADOR" : "JUGADORES"}`
              : statusLabel(g.status)}
          </span>
          <span className="game-type">{g.holes} hoyos</span>
        </div>
        <h3>{club}</h3>
        <p>
          <CalendarDays size={13} />
          {dateFormat(g.starts_at)}
          <i /> <Clock size={13} />
          {timeFormat(g.starts_at)}
        </p>
        <div className="game-card-bottom">
          <div className="participant-preview">
            <span>
              {confirmed}/{g.capacity}
            </span>
            Jugadores confirmados
          </div>
          <button onClick={onOpen}>
            Ver partida
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
function Rounds({
  data,
  onEdit,
  onNew,
}: {
  data: ReturnType<typeof useFairway>;
  onEdit: (r: Round) => void;
  onNew: () => void;
}) {
  return (
    <div className="panel round-history">
      <div className="panel-heading">
        <h3>Historial de rondas</h3>
        <span className="badge">{data.rounds.length} rondas</span>
      </div>
      {data.rounds.length ? (
        <div className="table-scroll">
          <table className="rounds-table">
            <thead>
              <tr>
                <th>Campo / fecha</th>
                <th>Modalidad</th>
                <th>Score</th>
                <th>Contra par</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.rounds.map((r) => {
                const s = summarize(r.scores);
                return (
                  <tr key={r.id}>
                    <td>
                      <strong>
                        {data.clubs.find((c) => c.id === r.club_id)?.name ||
                          r.course ||
                          "Otro campo"}
                      </strong>
                      <small>
                        {r.played_at} ·{" "}
                        {r.verified
                          ? "Datos verificados"
                          : "Captura no verificada"}
                      </small>
                    </td>
                    <td>{r.holes} hoyos</td>
                    <td className="total-score">{s.total}</td>
                    <td>
                      {s.relative === null
                        ? "—"
                        : s.relative > 0
                          ? "+" + s.relative
                          : s.relative}
                    </td>
                    <td>
                      <span className="badge">
                        {r.status === "draft"
                          ? "Borrador"
                          : r.status === "published"
                            ? "Publicado"
                            : "Finalizado"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        aria-label="Abrir scorecard"
                        onClick={() => onEdit(r)}
                      >
                        <ArrowUpRight size={19} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="El primer score es el comienzo"
          description="Registra una ronda, hoyo por hoyo, y construye tu historial."
          action={<Button onClick={onNew}>Registrar mi primera ronda</Button>}
        />
      )}
    </div>
  );
}
function FilterForm({
  filters: f,
  setFilters: set,
  clubs,
  onSave,
  onReset,
}: {
  filters: Filters;
  setFilters: (v: Filters) => void;
  clubs: { id: string; name: string }[];
  onSave: () => void;
  onReset: () => void;
}) {
  const update = (key: keyof Filters, value: string | number | boolean) =>
    set({ ...f, [key]: value });
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (f.minAge > f.maxAge || f.minHcp > f.maxHcp) return;
        onSave();
      }}
    >
      <Field label="Club de golf">
        <select value={f.club} onChange={(e) => update("club", e.target.value)}>
          <option value="any">Cualquier club</option>
          <option value="mine">Solo jugadores de mi club</option>
          <option value="none">Sin club</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="form-grid">
        <Field label="Handicap mínimo">
          <input
            type="number"
            min={-10}
            max={f.maxHcp}
            value={f.minHcp}
            onChange={(e) => update("minHcp", Number(e.target.value))}
          />
        </Field>
        <Field label="Handicap máximo">
          <input
            type="number"
            min={f.minHcp}
            max={54}
            value={f.maxHcp}
            onChange={(e) => update("maxHcp", Number(e.target.value))}
          />
        </Field>
        <Field label="Edad mínima">
          <input
            type="number"
            min={18}
            max={f.maxAge}
            value={f.minAge}
            onChange={(e) => update("minAge", Number(e.target.value))}
          />
        </Field>
        <Field label="Edad máxima">
          <input
            type="number"
            min={f.minAge}
            max={100}
            value={f.maxAge}
            onChange={(e) => update("maxAge", Number(e.target.value))}
          />
        </Field>
        <Field label="Disponibilidad">
          <select value={f.day} onChange={(e) => update("day", e.target.value)}>
            <option value="any">Cualquier día</option>
            {days.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Modalidad">
          <select
            value={f.holes}
            onChange={(e) => update("holes", e.target.value)}
          >
            <option value="any">9 o 18 hoyos</option>
            <option value="9">9 hoyos</option>
            <option value="18">18 hoyos</option>
          </select>
        </Field>
      </div>
      <Field label="Estilo de juego">
        <select
          value={f.style}
          onChange={(e) => update("style", e.target.value)}
        >
          <option value="any">Cualquier estilo</option>
          <option value="social">Social</option>
          <option value="intermedio">Intermedio</option>
          <option value="competitivo">Competitivo</option>
        </select>
      </Field>
      {[
        ["noHcp", "Incluir jugadores sin handicap"],
        ["verified", "Solo perfiles verificados"],
        ["guests", "Aceptan solicitudes de invitados"],
        ["beginner", "Acompañan a principiantes"],
        ["goodRating", "Calificación de 4 o más (con evaluaciones)"],
      ].map(([k, label]) => (
        <label className="checkbox" key={k}>
          <input
            type="checkbox"
            checked={Boolean(f[k as keyof Filters])}
            onChange={(e) => update(k as keyof Filters, e.target.checked)}
          />
          {label}
        </label>
      ))}
      <div className="button-row">
        <Button type="button" variant="outline" onClick={onReset}>
          <RotateCcw size={15} />
          Restablecer
        </Button>
        <Button>
          Aplicar filtros
          <Check size={16} />
        </Button>
      </div>
    </form>
  );
}
function Welcome({ onAuth }: { onAuth: () => void }) {
  return (
    <section className="welcome">
      <span className="eyebrow">FAIRWAY · LEÓN, GUANAJUATO</span>
      <h1>
        El golf es mejor
        <br />
        cuando se comparte.
      </h1>
      <p>
        Encuentra golfistas que comparten tu ritmo. Arma tu próximo foursome y
        lleva un registro de cada gran ronda.
      </p>
      <Button onClick={onAuth}>
        Encuentra tu comunidad
        <ArrowRight size={18} />
      </Button>
      <div className="welcome-image" />
      <div className="welcome-features">
        <div>
          <Compass size={25} />
          <h3>Encuentra tu foursome</h3>
          <p>Compatibilidad clara según tu club, estilo y disponibilidad.</p>
        </div>
        <div>
          <Flag size={25} />
          <h3>Nos vemos en el tee</h3>
          <p>Organiza partidas y aprueba a tus compañeros.</p>
        </div>
        <div>
          <TrendingUp size={25} />
          <h3>Cada golpe cuenta</h3>
          <p>Scorecards y estadísticas para seguir tu progreso.</p>
        </div>
      </div>
    </section>
  );
}
function Availability({
  data,
  openProfile,
  onCreate,
}: {
  data: ReturnType<typeof useFairway>;
  openProfile: (p: Profile) => void;
  onCreate: () => void;
}) {
  const [entries, setEntries] = useState<
    {
      user_id: string;
      starts_at: string;
      expires_at: string;
      holes: number;
      club_id: string;
    }[]
  >([]);
  async function load() {
    if (!supabase) return;
    const { data: r, error } = await supabase
      .from("availability")
      .select("*")
      .gt("expires_at", new Date().toISOString());
    if (error) data.notify(error.message);
    else setEntries(r || []);
  }
  useEffect(() => {
    void load();
  }, [data.user]);
  return (
    <>
      <SectionHeading
        eyebrow="ESPONTÁNEO TAMBIÉN ES UN GRAN PLAN"
        title="¿Quién juega hoy?"
        description="Publica tu disponibilidad temporal y encuentra compañía."
        action={
          <Button onClick={onCreate}>
            <Plus size={16} />
            Armar partida
          </Button>
        }
      />
      <form
        className="panel availability-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const start = new Date(
            String(f.get("date")) + "T" + String(f.get("time")) + ":00-06:00",
          );
          const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
          const ok = await data.run(
            () =>
              supabase!.from("availability").upsert({
                user_id: data.user!.id,
                club_id: f.get("club"),
                starts_at: start.toISOString(),
                expires_at: end.toISOString(),
                holes: Number(f.get("holes")),
              }),
            "Disponibilidad publicada por 4 horas desde el horario indicado.",
          );
          if (ok) void load();
        }}
      >
        <Field label="Fecha">
          <input type="date" name="date" required />
        </Field>
        <Field label="Hora aproximada">
          <input type="time" name="time" required />
        </Field>
        <Field label="Club">
          <select name="club">
            {data.clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hoyos">
          <select name="holes">
            <option>18</option>
            <option>9</option>
          </select>
        </Field>
        <Button>
          Estoy disponible
          <Sun size={16} />
        </Button>
      </form>
      <div className="profile-grid">
        {entries
          .filter((e) => e.user_id !== data.user?.id)
          .map((e) => {
            const p = data.profiles.find((p) => p.id === e.user_id);
            return (
              p && (
                <article className="panel availability-card" key={e.user_id}>
                  <Avatar profile={p} large />
                  <h3>{p.name}</h3>
                  <p>
                    {dateFormat(e.starts_at)} · {timeFormat(e.starts_at)} ·{" "}
                    {e.holes} hoyos
                  </p>
                  <Button variant="outline" onClick={() => openProfile(p)}>
                    Ver perfil
                  </Button>
                </article>
              )
            );
          })}
      </div>
      {!entries.length && (
        <Empty
          title="Sé el primero en salir al green"
          description="La disponibilidad vence automáticamente. Publica la tuya para que otros golfistas te encuentren."
        />
      )}
    </>
  );
}

function Gallery({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let current = true;
    void Promise.all(
      paths.map(async (p) => {
        if (p.startsWith("http")) return p;
        if (!supabase) return "";
        const { data } = await supabase.storage
          .from("profile-images")
          .createSignedUrl(p, 3600);
        return data?.signedUrl || "";
      }),
    ).then((u) => {
      if (current) setUrls(u.filter(Boolean));
    });
    return () => {
      current = false;
    };
  }, [paths.join("|")]);
  return urls.length ? (
    <div className="photo-gallery">
      {urls.map((u, i) => (
        <a href={u} key={u} target="_blank" rel="noreferrer">
          <img src={u} alt={`Fotografía de galería ${i + 1}`} />
        </a>
      ))}
    </div>
  ) : null;
}
