"use client";
import { Avatar, InfoItem } from "./member-primitives";
import { Rounds } from "./round-history";
import { FilterForm } from "./discovery-filters";
import { Availability } from "./availability";
import { Gallery } from "./profile-gallery";
import { LegalLinks } from "./legal-links";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { site } from "@/lib/site";
import { useNativeApp } from "@/lib/use-native-app";
import {
  Compass,
  Flag,
  Users,
  MessageCircle,
  UserRound,
  BarChart3,
  MapPin,
  Bell,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Plus,
  Heart,
  X,
  Bookmark,
  CalendarDays,
  Check,
  CheckCheck,
  Settings as SettingsIcon,
  LogOut,
  ShieldCheck,
  Target,
  Send,
  Trash2,
  QrCode,
  Camera,
  ArrowLeft,
} from "lucide-react";
import { useFairway } from "@/lib/use-fairway";
import { supabase } from "@/lib/supabase";
import {
  authReturnError,
  routeFromHash,
  completedAuthReturnUrl,
  passwordRecoveryError,
} from "@/lib/auth";
import {
  compatibility,
  initialFilters,
  summarize,
  type Profile,
  type Filters,
  type Game,
  type Round,
} from "@/lib/domain";
import { cn, dateFormat, timeFormat } from "@/lib/utils";
import { Button, Modal, Empty, SectionHeading } from "./ui";
import { useNativeShell } from "@/lib/use-native-shell";
import { nativeHaptic, NativeDevice } from "@/lib/native-device";
import {
  AccountRequired,
  ClubDirectory,
  GuestDiscover,
  LockedPreview,
  PublicPrivacy,
} from "./guest-experience";
import { requiresAccount } from "@/lib/access";
import { useFriends, profileWithPhoto } from "@/lib/use-friends";
import { sharedProfileId } from "@/lib/profile-share";
import { sharedGameId, sectionUrl } from "@/lib/game-share";

import { golfDate } from "@/lib/parties";
import { SidebarIcon } from "./sidebar-icon";
import { useIllustratedSidebarIcons } from "@/lib/appearance";
import { PlayerRating } from "./player-rating";

import { CourseIcon } from "./course-icon";
import { ProfileBio } from "./profile-bio";
import { CityFilter } from "./city-field";
import { DEFAULT_CITY, normalizeCity } from "@/lib/cities";
import { withRating } from "@/lib/ratings";

// Screens and editors download when opened, rather than on every public visit.
function DeferredPanel() {
  return (
    <div
      className="deferred-panel"
      role="status"
      aria-label="Cargando pantalla"
      aria-busy="true"
    >
      <span>Cargando…</span>
      <div className="native-deferred-skeleton" aria-hidden="true">
        <div className="skeleton heading-skeleton" />
        <div className="skeleton card-skeleton" />
      </div>
    </div>
  );
}
const Discovery = dynamic(
  () => import("./discovery").then((m) => m.Discovery),
  { loading: DeferredPanel },
);
const LandingPage = dynamic(
  () => import("./landing-page").then((m) => m.LandingPage),
  { loading: DeferredPanel },
);
const NativeEntry = dynamic(
  () => import("./native-shell").then((m) => m.NativeEntry),
  { loading: DeferredPanel },
);
const NativeRefresh = dynamic(() =>
  import("./native-shell").then((m) => m.NativeRefresh),
);
const NativeConnectionState = dynamic(() =>
  import("./native-shell").then((m) => m.NativeConnectionState),
);
const NativeSwipeRow = dynamic(() =>
  import("./native-shell").then((m) => m.NativeSwipeRow),
);
const NativeOfflinePanel = dynamic(() =>
  import("./native-preferences").then((m) => m.NativeOfflinePanel),
);
const NativeTabBar = dynamic(() =>
  import("./native-experience").then((m) => m.NativeTabBar),
);
const NativeQuickActions = dynamic(() =>
  import("./native-experience").then((m) => m.NativeQuickActions),
);
const NativeStoryComposer = dynamic(
  () => import("./stories").then((m) => m.NativeStoryComposer),
  { loading: DeferredPanel },
);
const GameDetails = dynamic(
  () => import("./game-details").then((m) => m.GameDetails),
  { loading: DeferredPanel },
);
const FirstRoundSetup = dynamic(
  () => import("./first-round-setup").then((m) => m.FirstRoundSetup),
  { loading: DeferredPanel },
);
const AuthForm = dynamic(
  () => import("./forms").then((module) => module.AuthForm),
  { loading: DeferredPanel },
);
const ProfileForm = dynamic(
  () => import("./forms").then((module) => module.ProfileForm),
  { loading: DeferredPanel },
);
const GameForm = dynamic(
  () => import("./forms").then((module) => module.GameForm),
  { loading: DeferredPanel },
);
const ReviewForm = dynamic(
  () => import("./forms").then((module) => module.ReviewForm),
  { loading: DeferredPanel },
);
const GoogleOnboarding = dynamic(
  () => import("./google-onboarding").then((module) => module.GoogleOnboarding),
  { loading: DeferredPanel },
);
const PasswordRecovery = dynamic(
  () => import("./password-recovery").then((module) => module.PasswordRecovery),
  { loading: DeferredPanel },
);
const Scorecard = dynamic(
  () => import("./scorecard").then((module) => module.Scorecard),
  { loading: DeferredPanel },
);
const Community = dynamic(
  () => import("./community").then((module) => module.Community),
  { loading: DeferredPanel },
);
const Settings = dynamic(
  () => import("./settings").then((module) => module.Settings),
  { loading: DeferredPanel },
);
const Admin = dynamic(
  () => import("./settings").then((module) => module.Admin),
  { loading: DeferredPanel },
);
const DeleteAccountDialog = dynamic(
  () => import("./delete-account").then((module) => module.DeleteAccountDialog),
  { loading: DeferredPanel },
);
const Friends = dynamic(
  () => import("./friends").then((module) => module.Friends),
  { loading: DeferredPanel },
);
const FriendshipActions = dynamic(
  () => import("./friends").then((module) => module.FriendshipActions),
  { loading: DeferredPanel },
);
const ProfileQR = dynamic(
  () => import("./profile-qr").then((module) => module.ProfileQR),
  { loading: DeferredPanel },
);
const Parties = dynamic(
  () => import("./parties").then((module) => module.Parties),
  { loading: DeferredPanel },
);
const ProfilePhotoEditor = dynamic(
  () => import("./profile-photo").then((module) => module.ProfilePhotoEditor),
  { loading: DeferredPanel },
);
const ProfileBioEditor = dynamic(
  () =>
    import("./profile-bio-editor").then((module) => module.ProfileBioEditor),
  { loading: DeferredPanel },
);

// Recharts is only needed when a member opens their statistics.
const Stats = dynamic(() => import("./stats").then((module) => module.Stats), {
  loading: () => <p role="status">Cargando estadísticas…</p>,
});
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
  const nativeApp = useNativeApp();
  const data = useFairway();
  const friends = useFriends(data);
  const [cityScope, setCityScope] = useState("mine");
  useEffect(() => setCityScope("mine"), [data.user?.id]);
  const ownCity = normalizeCity(data.me.city || DEFAULT_CITY);
  const exploringCity =
    cityScope === "any"
      ? "Todas las ciudades"
      : cityScope === "mine"
        ? ownCity
        : cityScope;
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
    [mobileOpen, setMobileOpen] = useState(false),
    [sidebarCollapsed, setSidebarCollapsed] = useState(false),
    [isMobile, setIsMobile] = useState(false),
    [activeChat, setActiveChat] = useState<string | null>(null),
    [message, setMessage] = useState(""),
    [profileTab, setProfileTab] = useState("Información"),
    [reviewTarget, setReviewTarget] = useState<Profile | null>(null),
    [busy, setBusy] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const focusNextPage = useRef(false);
  const sidebarVisible = isMobile ? mobileOpen : !sidebarCollapsed;
  const nativePrimaryPages = [
    "descubrir",
    "partidas",
    "scores",
    "mensajes",
    "perfil",
  ];
  const nativeParentPage = useRef("descubrir");
  const canNativeBack =
    !nativePrimaryPages.includes(page) || (page === "mensajes" && !!activeChat);
  const nativeBack = () => {
    if (page === "mensajes" && activeChat) setActiveChat(null);
    else go(nativeParentPage.current);
  };
  const nativeShell = useNativeShell({
    enabled: nativeApp,
    canBack: canNativeBack,
    blocked: !!modal || mobileOpen,
    onBack: nativeBack,
    onRefresh: async () => {
      await data.refresh();
      window.dispatchEvent(new Event("fairway:manual-refresh"));
    },
  });
  useEffect(() => {
    if (nativeApp && nativePrimaryPages.includes(page))
      nativeParentPage.current = page;
  }, [page, nativeApp]);

  useEffect(() => {
    const content =
      mainContentRef.current || document.querySelector<HTMLElement>("#fw-main");
    if (focusNextPage.current && !data.loading && !modal && content) {
      content.focus({ preventScroll: true });
      focusNextPage.current = false;
    }
  }, [page, data.loading, modal, data.user?.id]);

  useEffect(() => {
    const title =
      [...navigation, ...extras].find((item) => item.id === page)?.label ||
      (
        {
          ajustes: "Ajustes",
          admin: "Administración",
          hoy: "¿Quién juega hoy?",
          privacidad: "Privacidad",
        } as Record<string, string>
      )[page];
    document.title = title ? `${title} · Fairway` : site.title;
  }, [page, data.loading, data.user?.id]);

  useEffect(() => {
    if (page === "perfil" || modal === "profile") void data.refreshRatings();
  }, [page, modal, selected?.id, data.refreshRatings]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 740px)");
    function syncViewport() {
      setIsMobile(media.matches || nativeApp);
      setMobileOpen(false);
    }
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, [nativeApp]);

  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const focusable = () =>
      Array.from(
        sidebar.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
    (focusable()[0] ?? sidebar).focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
      } else if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (
        sidebar.contains(document.activeElement) ||
        document.activeElement === document.body
      )
        menuButtonRef.current?.focus();
    };
  }, [isMobile, mobileOpen]);

  const [sharedLocation, setSharedLocation] = useState("");
  const [gameLinkAttempt, setGameLinkAttempt] = useState(0);
  const onboarded = useRef<string | null>(null);
  const lastPublicPage = useRef("descubrir");
  const deletionReturn = useRef(false);
  const sharedProfileHandled = useRef<string | null>(null);
  function openAuth(mode: "login" | "signup" = "login") {
    setMobileOpen(false);
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
    if (nativeApp) {
      try {
        const { readQueuedScores } = await import("@/lib/native-offline");
        if (data.user && (await readQueuedScores(data.user.id)).length) {
          setModal("logout-pending");
          return;
        }
      } catch {
        data.notify(
          "No pudimos revisar los borradores. Intenta de nuevo antes de cerrar sesión.",
        );
        return;
      }
    }
    await finishLogout();
  }
  async function finishLogout() {
    if (!supabase) return;
    if (nativeApp)
      await import("@/lib/native-push")
        .then(({ disconnectNativePush }) => disconnectNativePush())
        .catch(() => {});
    const { error } = await supabase.auth.signOut();
    if (error) {
      data.notify(error.message);
      return;
    }
    focusNextPage.current = true;
    setModal(null);
    setMobileOpen(false);
    setPage("inicio");
    window.history.replaceState(null, "", location.pathname + "#inicio");
    data.notify("Cerraste sesión. Nos vemos pronto en el green.");
  }
  useEffect(() => {
    if (!nativeApp || !data.user) return;
    let current = true;
    let stop: (() => void) | undefined;
    void import("@/lib/native-push").then(async ({ installNativePush }) => {
      const cleanup = await installNativePush(data.user!.id);
      if (current) stop = cleanup;
      else cleanup();
    });
    return () => {
      current = false;
      stop?.();
    };
  }, [nativeApp, data.user?.id]);
  const appleSubject =
    data.user?.app_metadata.provider === "apple"
      ? data.user.identities?.find((identity) => identity.provider === "apple")
          ?.identity_data?.sub
      : null;
  useEffect(() => {
    if (!nativeApp || typeof appleSubject !== "string") return;
    let current = true;
    let stop: (() => void) | undefined;
    void import("@/lib/native-apple-auth")
      .then(async ({ installAppleSession }) => {
        const cleanup = await installAppleSession(appleSubject);
        if (current) stop = cleanup;
        else cleanup();
      })
      .catch(() => {});
    return () => {
      current = false;
      stop?.();
    };
  }, [nativeApp, appleSubject]);
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
      !data.passwordRecovery &&
      !["delete-account", "auth"].includes(modal || "") &&
      data.me.id === data.user.id &&
      data.me.availability.length === 0 &&
      !sharedProfileId(location.search) &&
      !sharedGameId(location.search) &&
      onboarded.current !== data.user.id
    ) {
      onboarded.current = data.user.id;
      setModal("first-round");
    }
  }, [data.user, data.loading, data.me, data.passwordRecovery]);
  useEffect(() => {
    const id = sharedProfileId(location.search);
    if (
      !id ||
      sharedGameId(location.search) ||
      data.passwordRecovery ||
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
  }, [data.user?.id, data.loading, data.passwordRecovery, sharedLocation]);
  function go(p: string) {
    if (nativeApp && p !== page) nativeHaptic();
    if (p === "inicio" && (data.user || (nativeApp && data.demo)))
      p = "descubrir";
    if (nativeApp && p === "mensajes" && page !== "mensajes")
      setActiveChat(null);
    focusNextPage.current = true;
    if (p === page && !modal) {
      mainContentRef.current?.focus({ preventScroll: true });
      focusNextPage.current = false;
    }
    setPage(p);
    setMobileOpen(false);
    if (!requiresAccount(p)) lastPublicPage.current = p;
    const href = sectionUrl(location.href, p);
    if (href !== location.pathname + location.search + location.hash)
      window.history.pushState(null, "", href);
    setSharedLocation("");
    setModal(null);
    setGame(null);
    if (!data.user && !data.demo && requiresAccount(p)) requireAccount(p);
    window.scrollTo({
      top: 0,
      behavior:
        nativeApp ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
    });
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
    const recovery = data.passwordRecovery;
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
    const change = (event?: Event) => {
      if (event) {
        focusNextPage.current = true;
        setMobileOpen(false);
        setModal(null);
        setSelected(null);
        setGame(null);
        setReviewTarget(null);
      }
      setSharedLocation(location.search);
      if (recovery) {
        setPage("ajustes");
        return;
      }
      if (!handleReturnError()) {
        const next = deletion
          ? "ajustes"
          : routeFromHash(
              location.hash,
              routes,
              !!data.user || (nativeApp && data.demo),
            );
        setPage(next);
        if (data.user && location.hash === "#inicio")
          window.history.replaceState(
            null,
            "",
            completedAuthReturnUrl(location.href, next),
          );
      }
    };
    change();
    window.addEventListener("hashchange", change);
    window.addEventListener("popstate", change);
    return () => {
      window.removeEventListener("hashchange", change);
      window.removeEventListener("popstate", change);
    };
  }, [data.user?.id, data.passwordRecovery, nativeApp, data.demo]);
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
    chatEnd.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
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
      [
        "profile",
        "profile-unavailable",
        "game",
        "game-unavailable",
        "game-error",
        "loading-game",
        "review",
      ].includes(modal || "") ||
      (!data.user && sharedProfileId(location.search))
    ) {
      const url = new URL(location.href);
      url.searchParams.delete("golfista");
      url.searchParams.delete("partida");
      setSharedLocation("");
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
  function openGame(next: Game) {
    const url = new URL(location.href);
    url.searchParams.delete("golfista");
    url.searchParams.set("partida", next.id);
    const href = url.pathname + url.search + url.hash;
    if (href !== location.pathname + location.search + location.hash)
      window.history.pushState(null, "", href);
    setGame(next);
    setModal("game");
  }
  useEffect(() => {
    const id = sharedGameId(sharedLocation);
    if (!id || !data.user || data.loading || data.passwordRecovery || !supabase)
      return;
    let current = true;
    setModal("loading-game");
    void supabase
      .from("games")
      .select("*,participants:game_participants(user_id,status)")
      .eq("id", id)
      .maybeSingle()
      .then(
        (result) => {
          if (!current) return;
          if (result.error) setModal("game-error");
          else if (!result.data) setModal("game-unavailable");
          else {
            setGame(result.data as Game);
            setModal("game");
          }
        },
        () => {
          if (current) setModal("game-error");
        },
      );
    return () => {
      current = false;
    };
  }, [
    sharedLocation,
    gameLinkAttempt,
    data.user?.id,
    data.loading,
    data.passwordRecovery,
  ]);
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
  useEffect(() => {
    if (!nativeApp) return;
    void NativeDevice.setBadge({
      count: data.user ? unread + unreadMessages : 0,
    }).catch(() => {});
  }, [nativeApp, data.user?.id, unread, unreadMessages]);
  if (!data.authReady)
    return (
      <main className="auth-screen">
        <section className="panel" aria-labelledby="session-title">
          <h1 id="session-title">
            {nativeApp ? "Abriendo Fairway" : "Golfistas y partidas en León"}
          </h1>
          {!nativeApp && (
            <p>
              Fairway te ayuda a encontrar con quién jugar, consultar clubes y
              organizar partidas.
            </p>
          )}
          <p role="status">Recuperando tu sesión…</p>
          {nativeApp ? <DeferredPanel /> : <LegalLinks />}
          <noscript>
            Activa JavaScript para iniciar sesión y utilizar Fairway.
          </noscript>
        </section>
      </main>
    );
  if (data.passwordRecovery)
    return (
      <PasswordRecovery
        ready={data.authReady}
        signedIn={!!data.user}
        error={passwordRecoveryError(data.authReturnIssue)}
        onDone={() => {
          focusNextPage.current = true;
          data.finishPasswordRecovery();
          setModal(null);
          setPage("descubrir");
          window.history.replaceState(
            null,
            "",
            completedAuthReturnUrl(location.href, "descubrir"),
          );
        }}
        onExit={() => {
          data.finishPasswordRecovery();
          setPage("descubrir");
          window.history.replaceState(
            null,
            "",
            completedAuthReturnUrl(location.href, "descubrir"),
          );
          if (!data.user) openAuth("login");
        }}
      />
    );
  if (data.user && data.needsGoogleProfile)
    return <GoogleOnboarding data={data} />;
  if (
    !data.user &&
    !(nativeApp && data.demo) &&
    (page === "inicio" || page === "descubrir")
  )
    return (
      <>
        {data.error && (
          <div role="alert" className="error-banner">
            {data.error}
            <button onClick={() => void data.reload()}>Reintentar</button>
          </div>
        )}
        {nativeApp ? (
          <NativeEntry
            onLogin={() => openAuth("login")}
            onSignup={() => openAuth("signup")}
            onClubs={() => go("clubes")}
          />
        ) : (
          <LandingPage
            onSignup={() => (data.user ? go("descubrir") : openAuth("signup"))}
            onLogin={() => (data.user ? go("perfil") : openAuth("login"))}
            onClubs={() => go("clubes")}
            onPrivacy={() => go("privacidad")}
            clubs={data.clubs}
            liveDirectory={data.publicDirectoryLive}
            signedIn={!!data.user}
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
                focusNextPage.current = true;
                setAuthNotice("");
                setModal(null);
                setPage("perfil");
                window.history.replaceState(
                  null,
                  "",
                  location.pathname + location.search + "#perfil",
                );
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
            />
          </Modal>
        )}
      </>
    );
  return (
    <div
      className={cn(
        "app-shell",
        nativeApp && "native-app",
        hasAuth && "member-shell",
        sidebarCollapsed && "sidebar-collapsed",
        mobileOpen && "mobile-sidebar-open",
      )}
    >
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          mainContentRef.current?.focus();
          mainContentRef.current?.scrollIntoView({ block: "start" });
        }}
      >
        Saltar al contenido
      </a>
      <aside
        id="fairway-sidebar"
        ref={sidebarRef}
        className={cn("sidebar", mobileOpen && "open")}
        inert={!sidebarVisible}
        aria-hidden={!sidebarVisible}
        role={isMobile ? "dialog" : undefined}
        aria-modal={isMobile && mobileOpen ? true : undefined}
        aria-label="Menú de navegación"
        tabIndex={-1}
      >
        <div className="sidebar-heading">
          <button
            type="button"
            className="icon-btn sidebar-close"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
          >
            <X size={21} />
          </button>
          <a
            className="brand"
            href="#descubrir"
            onClick={(event) => {
              event.preventDefault();
              go("descubrir");
            }}
          >
            <span className="brand-mark">
              <Flag size={26} strokeWidth={1.6} />
            </span>
            fairway<span className="brand-dot">.</span>
          </a>
        </div>
        <div className="sidebar-city">
          <MapPin size={14} />
          {ownCity}
          <span className="live-dot" />
        </div>
        <span className="nav-caption">
          {nativeApp ? "MÁS EN FAIRWAY" : "TU COMUNIDAD DE GOLF"}
        </span>
        <nav aria-label="Navegación principal">
          {navigation
            .filter(
              ({ id }) => !nativeApp || ["comunidad", "amigos"].includes(id),
            )
            .map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={cn("nav-item", page === id && "active")}
                aria-current={page === id ? "page" : undefined}
                onClick={() => go(id)}
              >
                {useIllustratedSidebarIcons ? (
                  <SidebarIcon name={id} />
                ) : (
                  <Icon size={20} strokeWidth={1.7} />
                )}
                <span className="nav-label">{label}</span>
                {id === "mensajes" && unreadMessages > 0 && (
                  <span className="count">{unreadMessages}</span>
                )}
                {id === "amigos" &&
                  friends.relations.some(
                    (r) =>
                      r.status === "pending" &&
                      r.recipient_id === data.user?.id,
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
                {page === id && (
                  <span className="nav-dot" aria-hidden="true">
                    <CourseIcon part="green" size={20} />
                  </span>
                )}
              </button>
            ))}
        </nav>
        <div className="nav-divider" />
        <span className="nav-caption">MI JUEGO</span>
        <nav aria-label="Mi juego">
          {(nativeApp
            ? [...extras, { id: "hoy", label: "Jugar hoy", icon: Flag }]
            : extras
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={cn("nav-item", page === id && "active")}
              aria-current={page === id ? "page" : undefined}
              onClick={() => go(id)}
            >
              {useIllustratedSidebarIcons ? (
                <SidebarIcon name={id} />
              ) : (
                <Icon size={19} strokeWidth={1.7} />
              )}
              <span className="nav-label">{label}</span>
              {page === id && (
                <span className="nav-dot" aria-hidden="true">
                  <CourseIcon part="green" size={20} />
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-promo">
          <span className="mini-sun">
            <CourseIcon part="rough" size={26} />
          </span>
          <h3>¿Quién juega hoy?</h3>
          <p>
            Hay una buena ronda
            <br />
            esperándote.
          </p>
          <button
            aria-current={page === "hoy" ? "page" : undefined}
            onClick={() => go("hoy")}
          >
            Encuentra compañía
            {page === "hoy" ? (
              <CourseIcon part="green" size={20} />
            ) : (
              <ArrowUpRight size={16} />
            )}
          </button>
        </div>
        <div className="sidebar-bottom">
          <button
            className={cn(
              "nav-item",
              ["ajustes", "privacidad"].includes(page) && "active",
            )}
            aria-current={
              ["ajustes", "privacidad"].includes(page) ? "page" : undefined
            }
            onClick={() =>
              go(data.user || data.demo ? "ajustes" : "privacidad")
            }
          >
            <SettingsIcon size={18} />
            <span className="nav-label">
              {data.user || data.demo ? "Ajustes y privacidad" : "Privacidad"}
            </span>
            {["ajustes", "privacidad"].includes(page) && (
              <span className="nav-dot" aria-hidden="true">
                <CourseIcon part="green" size={20} />
              </span>
            )}
          </button>
          {data.user && (
            <button className="nav-item" onClick={() => void logout()}>
              <LogOut size={18} />
              Cerrar sesión
            </button>
          )}
          {data.admin && (
            <button
              className={cn("nav-item", page === "admin" && "active")}
              aria-current={page === "admin" ? "page" : undefined}
              onClick={() => go("admin")}
            >
              <ShieldCheck size={18} />
              <span className="nav-label">Administración</span>
              {page === "admin" && (
                <span className="nav-dot" aria-hidden="true">
                  <CourseIcon part="green" size={20} />
                </span>
              )}
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
      <button
        type="button"
        className={cn("sidebar-scrim", mobileOpen && "visible")}
        aria-label="Cerrar menú"
        aria-hidden={!mobileOpen}
        tabIndex={-1}
        inert={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />
      <div className="workspace" inert={isMobile && mobileOpen}>
        <header className="topbar">
          <div className="breadcrumb">
            {nativeApp && canNativeBack && (
              <button
                type="button"
                className="icon-btn native-screen-back"
                aria-label="Volver a la pantalla anterior"
                onClick={nativeBack}
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <button
              type="button"
              ref={menuButtonRef}
              className="icon-btn sidebar-toggle"
              aria-label={
                sidebarVisible
                  ? "Ocultar menú"
                  : nativeApp
                    ? "Más opciones"
                    : "Mostrar menú"
              }
              title={sidebarVisible ? "Ocultar menú" : "Mostrar menú"}
              aria-expanded={sidebarVisible}
              aria-controls="fairway-sidebar"
              onClick={() =>
                isMobile
                  ? setMobileOpen((open) => !open)
                  : setSidebarCollapsed((collapsed) => !collapsed)
              }
            >
              <span className="sidebar-toggle-lines" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
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
            {nativeApp && (
              <span className="native-header-brand">
                <Flag size={16} />
                fairway.
              </span>
            )}
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="location city-location-button"
              onClick={() => setModal("city")}
              aria-label={`Ciudad para explorar: ${exploringCity}. Cambiar ciudad`}
            >
              <MapPin size={14} />
              <span>{exploringCity}</span>
              <ChevronDown size={12} />
            </button>
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
        <main
          id="main-content"
          ref={mainContentRef}
          tabIndex={-1}
          data-page={page}
        >
          {nativeApp && (
            <>
              <NativeConnectionState cachedAt={data.nativeCachedAt} />
              <NativeRefresh {...nativeShell} />
            </>
          )}
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
          ) : nativeApp &&
            data.nativeCachedAt &&
            [
              "descubrir",
              "partidas",
              "mensajes",
              "comunidad",
              "amigos",
              "hoy",
            ].includes(page) ? (
            <Empty
              title="Esta pantalla necesita conexión"
              description="Para mostrar jugadores, lugares disponibles y conversaciones actualizados necesitamos internet. Tus scores guardados y las tarjetas nuevas siguen a mano."
              action={
                <div className="button-row">
                  <Button onClick={() => go("scores")}>Abrir mis scores</Button>
                  <Button variant="outline" onClick={score}>
                    Anotar un borrador
                  </Button>
                </div>
              }
            />
          ) : !hasAuth ? (
            <>
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
                  cityScope={cityScope}
                  ownCity={ownCity}
                  onCityScopeChange={setCityScope}
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
              {nativeApp && page === "descubrir" && (
                <NativeQuickActions
                  onCreate={() => {
                    setPartyDate(undefined);
                    setModal("create-party");
                  }}
                  onScore={score}
                  onFriends={() => go("amigos")}
                  onStory={() => setModal("create-story")}
                />
              )}
              {page === "descubrir" && (
                <>
                  <Discovery
                    compact={nativeApp}
                    data={data}
                    filters={filters}
                    cityScope={cityScope}
                    onCityScopeChange={setCityScope}
                    onFilters={() => {
                      setDraftFilters(filters);
                      setModal("filters");
                    }}
                    onResetFilters={() => setFilters(initialFilters)}
                    onProfile={openProfile}
                    onGame={openGame}
                    onCreate={() => {
                      setPartyDate(undefined);
                      setModal("create-party");
                    }}
                    onShareProfile={() => setModal("profile-qr")}
                    onSetup={() => setModal("first-round")}
                    onNavigate={go}
                    onCompatibility={() => setModal("compatibility")}
                  />
                </>
              )}
              {page === "partidas" && (
                <Parties
                  compact={nativeApp}
                  data={data}
                  cityScope={cityScope}
                  onCityScopeChange={setCityScope}
                  calendarDate={partyCalendarDate}
                  onCalendarDateChange={setPartyCalendarDate}
                  onCreate={(date) => {
                    setPartyDate(date);
                    setModal("create-party");
                  }}
                  onOpen={openGame}
                />
              )}
              {page === "mensajes" && (
                <>
                  <SectionHeading
                    eyebrow="DEL MATCH AL TEE"
                    title={
                      nativeApp
                        ? "Tus conversaciones"
                        : "Buenas conversaciones. Mejores rondas."
                    }
                    description="Conversa con tus matches y con los participantes de tus partidas."
                  />
                  <div
                    className={cn(
                      "chat-layout",
                      nativeApp && currentChat && "native-chat-open",
                    )}
                  >
                    <aside className="chat-sidebar">
                      <h3>
                        Mis conversaciones{" "}
                        <span>{data.conversations.length}</span>
                      </h3>
                      {data.conversations.map((c) => {
                        const last = data.messages
                          .filter((m) => m.conversation_id === c.id)
                          .at(-1);
                        const contact = (
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
                        return nativeApp ? (
                          <NativeSwipeRow
                            key={c.id}
                            onRead={async () => {
                              if (!data.user || !supabase) return false;
                              const result = await supabase
                                .from("conversation_members")
                                .update({
                                  last_read_at: new Date().toISOString(),
                                })
                                .eq("conversation_id", c.id)
                                .eq("user_id", data.user.id);
                              if (result.error) {
                                data.notify(
                                  "No se pudo marcar como leída. Revisa tu conexión.",
                                );
                                return false;
                              }
                              await data.refresh();
                              return true;
                            }}
                          >
                            {contact}
                          </NativeSwipeRow>
                        ) : (
                          contact
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
                            {nativeApp && (
                              <button
                                type="button"
                                className="native-chat-back"
                                onClick={() => setActiveChat(null)}
                              >
                                <ArrowLeft size={18} />
                                Conversaciones
                              </button>
                            )}
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
                          <div
                            className="chat-messages"
                            role="log"
                            aria-label="Mensajes de la conversación"
                            aria-live="polite"
                            aria-relevant="additions text"
                            tabIndex={0}
                          >
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
                          onClick={() => setModal("edit-photo")}
                        >
                          Cambiar foto
                        </Button>
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
                      <button
                        type="button"
                        className="profile-photo-action"
                        aria-label="Cambiar mi foto de perfil"
                        title="Cambiar foto"
                        aria-haspopup="dialog"
                        onClick={() => setModal("edit-photo")}
                      >
                        <Avatar profile={data.me} large />
                        <span
                          className="profile-photo-camera"
                          aria-hidden="true"
                        >
                          <Camera size={14} />
                        </span>
                      </button>
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
                  <ProfileBio
                    bio={data.me.bio}
                    onEdit={() => setModal("edit-bio")}
                  />
                  <section
                    className="panel player-reputation"
                    aria-label="Tu calificación como compañero"
                  >
                    <h3 className="course-heading">
                      <CourseIcon part="green" size={24} /> Tu calificación como
                      compañero
                    </h3>
                    <PlayerRating profile={data.me} />
                    <p>
                      Promedio de quienes compartieron contigo una partida
                      finalizada.
                    </p>
                  </section>
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
                        aria-pressed={profileTab === t}
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
                      <h3>Preferencias de golf</h3>
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
                  {nativeApp && <NativeOfflinePanel userId={data.user?.id} />}
                  <SectionHeading
                    eyebrow="CADA GOLPE CUENTA"
                    title={
                      nativeApp ? "Mis scores" : "La historia de tu juego."
                    }
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
                    title={
                      nativeApp ? "Mis estadísticas" : "Tu juego en números."
                    }
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
                    title={
                      nativeApp ? "Tu comunidad" : "Historias que se comparten."
                    }
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
                  cityScope={cityScope}
                  ownCity={ownCity}
                  onCityScopeChange={setCityScope}
                  onPlayers={(id) => {
                    setCityScope("any");
                    setFilters({ ...initialFilters, club: id });
                    go("descubrir");
                  }}
                />
              )}
              {page === "privacidad" && <PublicPrivacy />}
              {page === "hoy" && (
                <Availability
                  data={data}
                  cityScope={cityScope}
                  onCityScopeChange={setCityScope}
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
            <LegalLinks />
            <span>Hecho para compartir el juego.</span>
          </footer>
        </main>
      </div>
      {nativeApp ? (
        <NativeTabBar
          page={page}
          onNavigate={go}
          unreadMessages={unreadMessages}
          inert={isMobile && mobileOpen}
        />
      ) : (
        <nav
          className="mobile-nav"
          aria-label="Navegación móvil"
          inert={isMobile && mobileOpen}
        >
          {navigation
            .filter(({ id }) => id !== "comunidad")
            .map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={page === id ? "active" : ""}
                aria-current={page === id ? "page" : undefined}
                onClick={() => go(id)}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            ))}
        </nav>
      )}
      {data.toast && (
        <div
          className="toast"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <Check size={17} />
          {data.toast}
          <button aria-label="Cerrar aviso" onClick={() => data.notify("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {nativeApp && modal === "create-story" && (
        <NativeStoryComposer data={data} onClose={close} />
      )}
      {nativeApp && modal === "logout-pending" && (
        <Modal title="Tienes scores sin sincronizar" onClose={close}>
          <p>
            Cerrar sesión eliminará de este iPhone los borradores que todavía no
            se han subido. Puedes conservar la sesión y sincronizarlos primero.
          </p>
          <div className="button-row">
            <Button
              onClick={() => {
                close();
                go("scores");
              }}
            >
              Conservar y revisar scores
            </Button>
            <Button variant="outline" onClick={() => void finishLogout()}>
              Cerrar sesión y eliminar borradores locales
            </Button>
          </div>
        </Modal>
      )}
      {modal === "city" && (
        <Modal
          title="Tu ciudad y dónde explorar"
          onClose={() => setModal(null)}
        >
          <p className="form-intro">
            Tu ciudad de perfil es {ownCity}. Explorar otra ciudad no cambia tu
            perfil ni usa tu ubicación.
          </p>
          <CityFilter
            scope={cityScope}
            ownCity={ownCity}
            cities={[
              ...data.clubs.map((c) => c.city),
              ...data.profiles.map((p) => p.city),
            ]}
            onChange={setCityScope}
          />
          <div className="button-row">
            <Button type="button" onClick={() => setModal(null)}>
              Listo
            </Button>
            {hasAuth && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setModal("edit-profile")}
              >
                Editar mi ciudad de perfil
              </Button>
            )}
          </div>
        </Modal>
      )}
      {modal === "account-required" && (
        <AccountRequired
          feature={gateFeature}
          onClose={close}
          onLogin={() => openAuth("login")}
          onSignup={() => openAuth("signup")}
        />
      )}
      {modal === "first-round" && data.user && (
        <Modal title="Prepara tu primera ronda" onClose={close}>
          <FirstRoundSetup
            profile={data.me}
            clubs={data.clubs}
            onSkip={close}
            onSave={async (preferences) => {
              const ok = await data.run(
                () =>
                  supabase!
                    .from("profiles")
                    .update(preferences)
                    .eq("id", data.user!.id)
                    .select("id")
                    .single(),
                "Preferencias guardadas.",
              );
              if (!ok)
                throw new Error(
                  "No pudimos guardar tus preferencias. Revisa tu conexión e intenta de nuevo.",
                );
            }}
            onDone={(destination) => {
              close();
              go(destination === "crear" ? "partidas" : "descubrir");
              if (destination === "crear") {
                setPartyDate(undefined);
                setModal("create-party");
              }
            }}
          />
        </Modal>
      )}
      {modal === "loading-game" && (
        <Modal title="Abriendo partida" onClose={close}>
          <p role="status">Buscando el plan…</p>
        </Modal>
      )}
      {(modal === "game-unavailable" || modal === "game-error") && (
        <Modal
          title={
            modal === "game-error"
              ? "No pudimos cargar la partida"
              : "Partida no disponible"
          }
          onClose={close}
        >
          <p>
            {modal === "game-error"
              ? "Revisa tu conexión e intenta de nuevo."
              : "Puede ser privada, haberse eliminado o requerir una invitación. El enlace no cambia los permisos de acceso."}
          </p>
          {modal === "game-error" && (
            <Button onClick={() => setGameLinkAttempt((n) => n + 1)}>
              Reintentar
            </Button>
          )}
          <Button variant="outline" onClick={close}>
            Volver a explorar
          </Button>
        </Modal>
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
              focusNextPage.current = true;
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
      {modal === "edit-photo" && (
        <Modal title="Tu foto de perfil" onClose={close}>
          <ProfilePhotoEditor
            currentPhoto={data.me.photo}
            hasPhoto={!!(data.me.photo_path || data.me.photo)}
            onSave={data.changePhoto}
            onDone={close}
          />
        </Modal>
      )}
      {modal === "edit-bio" && (
        <Modal title="Tu biografía" onClose={close}>
          <ProfileBioEditor
            initialBio={data.me.bio}
            onDone={close}
            onSave={(bio) =>
              data.run(
                () =>
                  supabase!
                    .from("profiles")
                    .update({ bio })
                    .eq("id", data.user!.id)
                    .select("id")
                    .single(),
                "Biografía actualizada.",
              )
            }
          />
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
          <ProfileBio bio={selected.bio} />
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
          <section
            className="player-reputation"
            aria-label="Calificación como compañero"
          >
            <h3>Calificación como compañero</h3>
            <PlayerRating profile={withRating(selected, data.ratings)} />
            <p>Solo califican compañeros de partidas finalizadas.</p>
          </section>
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
        <GameDetails
          game={currentGame}
          clubName={clubName(currentGame.club_id)}
          data={data}
          onClose={close}
          onChat={(id) => {
            selectChat(id);
            close();
            go("mensajes");
          }}
          onReview={(target) => {
            setReviewTarget(target);
            setModal("review");
          }}
        />
      )}
      {modal === "review" && reviewTarget && currentGame && (
        <Modal
          title={`Calificar a ${reviewTarget.name}`}
          onClose={() => {
            setReviewTarget(null);
            setModal("game");
          }}
        >
          <ReviewForm
            data={data}
            game={currentGame}
            target={reviewTarget}
            onDone={() => {
              setReviewTarget(null);
              setModal("game");
            }}
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
