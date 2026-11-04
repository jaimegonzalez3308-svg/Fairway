"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, initialAuthReturn } from "./supabase";
import {
  demoMe,
  demoProfiles,
  clubs as demoClubs,
  demoGames,
  demoRounds,
} from "./demo";
import type { Profile, Club, Game, Round } from "./domain";
import { authErrorMessage } from "./auth";
import { incomingWatermarks } from "./message-receipts";
import { NATIVE_RESUME } from "./native-support";
import { isIOSApp, nativeBridge } from "./native-app";
import { nativeOnline, NATIVE_NETWORK_CHANGED } from "./native-network";
import {
  resolveProfilePhoto,
  saveProfilePhoto,
  PROFILE_PHOTO_REFRESH_MS,
} from "./profile-images";
import { initialSignupCity, saveInitialSignupCity } from "./signup-city";
import {
  withRating,
  type RatingSummary,
  type SubmittedReview,
} from "./ratings";
const anonymousProfile: Profile = {
  id: "",
  name: "Mi cuenta",
  city: "León",
  age: 18,
  handicap: null,
  club_id: null,
  bio: "",
  availability: [],
  holes: 18,
  style: "social",
  photo: "",
  verified: false,
  accepts_guests: false,
  beginner_friendly: false,
};
export type Conversation = {
  id: string;
  match_id: string | null;
  game_id: string | null;
  conversation_members: {
    user_id: string;
    last_read_at: string;
    last_delivered_at?: string | null;
  }[];
  game?: Pick<Game, "id" | "club_id" | "starts_at" | "holes" | "status"> | null;
};
const conversationSelect =
  "*,conversation_members(*),game:games(id,club_id,starts_at,holes,status)";
export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
export type Notification = {
  id: string;
  title: string;
  category: string;
  read: boolean;
  created_at: string;
};
export function useFairway() {
  const [user, setUser] = useState<User | null>(null),
    [authReady, setAuthReady] = useState(!supabase),
    [passwordRecovery, setPasswordRecovery] = useState(
      initialAuthReturn.recovery,
    ),
    [authReturnIssue, setAuthReturnIssue] = useState(initialAuthReturn.error),
    [loading, setLoading] = useState(!!supabase),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [me, setMe] = useState<Profile>(supabase ? anonymousProfile : demoMe),
    [profiles, setProfiles] = useState<Profile[]>(supabase ? [] : demoProfiles),
    [clubs, setClubs] = useState<Club[]>(supabase ? [] : demoClubs),
    [games, setGames] = useState<Game[]>(supabase ? [] : demoGames),
    [rounds, setRounds] = useState<Round[]>(supabase ? [] : demoRounds),
    [decided, setDecided] = useState<string[]>([]),
    [favorites, setFavorites] = useState<string[]>([]),
    [conversations, setConversations] = useState<Conversation[]>([]),
    [messages, setMessages] = useState<Message[]>([]),
    [notifications, setNotifications] = useState<Notification[]>([]),
    [admin, setAdmin] = useState(false);
  const [publicDirectoryLive, setPublicDirectoryLive] = useState(false);
  const [needsGoogleProfile, setNeedsGoogleProfile] = useState(false);
  const [nativeCachedAt, setNativeCachedAt] = useState<number | null>(null);
  const [partiesAvailable, setPartiesAvailable] = useState(!supabase);
  const [ratings, setRatings] = useState<RatingSummary[]>(
    supabase
      ? []
      : [demoMe, ...demoProfiles]
          .filter((p) => p.review_count)
          .map((p) => ({
            user_id: p.id,
            rating: p.rating!,
            review_count: p.review_count!,
          })),
  );
  const [myReviews, setMyReviews] = useState<SubmittedReview[]>([]);
  const photosRefreshedAt = useRef(0);
  const photoRevision = useRef(0);
  const currentUserId = useRef(user?.id);
  currentUserId.current = user?.id;
  const demo = !supabase;
  useEffect(() => {
    if (!supabase || user) return;
    let current = true;
    void supabase
      .from("clubs")
      .select("id,name,city,verified,description,access_info")
      .order("name")
      .then(({ data, error }) => {
        if (!current) return;
        setPublicDirectoryLive(!error);
        // Con Supabase configurado nunca se muestran clubes demo como si fueran reales.
        if (error) {
          setClubs([]);
          setToast(
            "No pudimos cargar los clubes. Revisa tu conexión e intenta de nuevo.",
          );
        } else setClubs(data as Club[]);
      });
    return () => {
      current = false;
    };
  }, [user]);
  const notify = useCallback((s: string) => {
    setToast(s);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const load = useCallback(async (u: User, quiet = false) => {
    if (!supabase || currentUserId.current !== u.id) return;
    const loadedPhotoRevision = photoRevision.current;
    if (!quiet) setLoading(true);
    setError("");
    const restoreOffline = async () => {
      if (!isIOSApp(nativeBridge())) return false;
      const { readOfflineSnapshot } = await import("./native-offline");
      const cached = await readOfflineSnapshot(u.id);
      if (!cached || currentUserId.current !== u.id) return false;
      setMe(cached.me);
      setClubs(cached.clubs);
      setPublicDirectoryLive(true);
      setRounds(cached.rounds);
      setProfiles([]);
      setGames([]);
      setConversations([]);
      setMessages([]);
      setAdmin(false);
      setNeedsGoogleProfile(false);
      setNativeCachedAt(cached.savedAt);
      return true;
    };
    try {
      if (isIOSApp(nativeBridge()) && !nativeOnline()) {
        if (!(await restoreOffline()))
          setError(
            "Sin conexión y sin una copia reciente. Conéctate para cargar tus datos por primera vez.",
          );
        return;
      }
      // Un alta con Google no tiene perfil ni acceso privado hasta declarar su edad.
      const ownProfile = await supabase
        .from("profiles")
        .select("id,city,availability")
        .eq("id", u.id)
        .maybeSingle();
      if (currentUserId.current !== u.id) return;
      if (ownProfile.error) throw ownProfile.error;
      if (
        !ownProfile.data &&
        ["google", "apple"].includes(u.app_metadata.provider || "")
      ) {
        setNeedsGoogleProfile(true);
        return;
      }
      if (ownProfile.data) {
        const city = initialSignupCity(ownProfile.data, u.user_metadata);
        if (city) {
          try {
            await saveInitialSignupCity(supabase, u.id, city);
          } catch {
            if (currentUserId.current !== u.id) return;
            // A rejected city must not prevent access to the profile editor.
            setError(
              "No pudimos guardar tu ciudad de registro. Puedes corregirla en Editar perfil.",
            );
          }
        }
        if (currentUserId.current !== u.id) return;
      }
      const r = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("clubs").select("*"),
        supabase
          .from("games")
          .select("*,participants:game_participants(user_id,status)")
          .order("starts_at"),
        supabase
          .from("rounds")
          .select("*")
          .eq("user_id", u.id)
          .order("played_at"),
        supabase.from("decisions").select("target_id").eq("actor_id", u.id),
        supabase.from("favorites").select("target_id").eq("user_id", u.id),
        supabase.from("conversations").select(conversationSelect),
        supabase.from("messages").select("*").order("created_at"),
        supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("account_roles")
          .select("is_admin,suspended")
          .eq("user_id", u.id)
          .single(),
        supabase.rpc("rating_summary"),
        supabase.from("games").select("join_mode").limit(0),
        supabase
          .from("reviews")
          .select("game_id,target_id,punctuality,respect,pace,company")
          .eq("reviewer_id", u.id),
      ]);
      if (currentUserId.current !== u.id) return;
      // La actualización de parties es opcional para las bases existentes.
      setPartiesAvailable(!r[11].error);
      const failed = [...r.slice(0, 11), r[12]].find((x) => x.error);
      if (failed?.error) throw failed.error;
      const all = r[0].data as Profile[];
      const own = all.find((x) => x.id === u.id);
      if (!own)
        throw new Error(
          "No se encontró tu perfil. Revisa la migración y el estado de la cuenta.",
        );
      const photos = await Promise.all(
        all.map((p) => resolveProfilePhoto(supabase!, p)),
      );
      photosRefreshedAt.current = Date.now();
      const ratings = r[10].data as RatingSummary[];
      if (currentUserId.current !== u.id) return;
      setRatings(ratings);
      setMyReviews(r[12].data as SubmittedReview[]);
      const ownPhoto = photos.find((p) => p.id === u.id) || own;
      setMe((current) =>
        withRating(
          photoRevision.current === loadedPhotoRevision
            ? ownPhoto
            : {
                ...ownPhoto,
                photo: current.photo,
                photo_path: current.photo_path,
              },
          ratings,
        ),
      );
      if (
        photoRevision.current === loadedPhotoRevision &&
        ownPhoto.photo_path &&
        !ownPhoto.photo
      )
        setError(
          "Tu foto está guardada, pero no pudimos cargarla. Recarga la página para reintentar o usa Cambiar foto para elegir otra.",
        );
      setNeedsGoogleProfile(false);
      setProfiles(
        photos.filter((x) => x.id !== u.id).map((p) => withRating(p, ratings)),
      );
      setClubs(r[1].data as Club[]);
      setGames(r[2].data as Game[]);
      setRounds(r[3].data as Round[]);
      setDecided(r[4].data!.map((x) => x.target_id));
      setFavorites(r[5].data!.map((x) => x.target_id));
      setConversations(r[6].data as Conversation[]);
      setMessages(r[7].data as Message[]);
      setNotifications(r[8].data as Notification[]);
      setAdmin(!!r[9].data?.is_admin);
      setNativeCachedAt(null);
      if (isIOSApp(nativeBridge()))
        void import("./native-offline")
          .then(({ saveOfflineSnapshot }) =>
            saveOfflineSnapshot(
              {
                userId: u.id,
                savedAt: Date.now(),
                me: ownPhoto,
                clubs: r[1].data as Club[],
                rounds: r[3].data as Round[],
              },
              () => currentUserId.current === u.id,
            ),
          )
          .catch(() => {});
    } catch (e) {
      if (currentUserId.current !== u.id) return;
      const networkFailure =
        !nativeOnline() ||
        e instanceof TypeError ||
        /failed to fetch|network|fetch failed/i.test(
          (e as { message?: string })?.message || "",
        );
      if (
        isIOSApp(nativeBridge()) &&
        networkFailure &&
        (await restoreOffline().catch(() => false))
      )
        return;
      setError(
        e instanceof Error
          ? e.message
          : (e as { message?: string }).message ||
              "No se pudieron cargar los datos.",
      );
    } finally {
      if (!quiet && currentUserId.current === u.id) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .initialize()
      .then(({ error }) => {
        if (error) setAuthReturnIssue(authErrorMessage(error));
        return supabase!.auth.getSession();
      })
      .then(({ data, error }) => {
        if (error) {
          setError(authErrorMessage(error));
          setAuthReturnIssue(authErrorMessage(error));
        }
        currentUserId.current = data.session?.user.id;
        setUser(data.session?.user ?? null);
        setAuthReady(true);
        if (data.session?.user) void load(data.session.user);
        else setLoading(false);
      })
      .catch(() => {
        setError(
          "No se pudo recuperar la sesión. Revisa tu conexión y recarga la página.",
        );
        setLoading(false);
        setPartiesAvailable(false);
        setAuthReady(true);
      });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      const previousId = currentUserId.current;
      if (
        previousId &&
        s?.user &&
        previousId !== s.user.id &&
        isIOSApp(nativeBridge())
      ) {
        void import("./native-offline")
          .then(({ clearOfflineData }) => clearOfflineData())
          .catch(() => {});
      }
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      if (event === "SIGNED_OUT") setPasswordRecovery(false);
      currentUserId.current = s?.user.id;
      setUser(s?.user ?? null);
      if (s?.user) setTimeout(() => void load(s.user), 0);
      else {
        setNativeCachedAt(null);
        if (isIOSApp(nativeBridge()))
          void import("./native-offline")
            .then(async ({ clearOfflineData }) => {
              await clearOfflineData();
              if (!currentUserId.current) {
                const { NativeDevice } = await import("./native-device");
                await NativeDevice.clearPrivateData();
              }
            })
            .catch(() => {});
        if (isIOSApp(nativeBridge()))
          void import("./native-push")
            .then(({ disconnectNativePush }) => disconnectNativePush())
            .catch(() => {});
        setNeedsGoogleProfile(false);
        setMe(anonymousProfile);
        setDecided([]);
        setFavorites([]);
        setNotifications([]);
        setAdmin(false);
        setError("");
        setProfiles([]);
        setGames([]);
        setRounds([]);
        setConversations([]);
        setMessages([]);
        setRatings([]);
        setMyReviews([]);
        setPartiesAvailable(false);
        setLoading(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [load]);
  useEffect(() => {
    if (!user || !isIOSApp(nativeBridge())) return;
    let disposed = false;
    let syncing = false;
    const synchronize = async (event?: Event) => {
      if (syncing || !nativeOnline() || currentUserId.current !== user.id)
        return;
      syncing = true;
      try {
        const { syncQueuedScores } = await import("./native-offline");
        const count = await syncQueuedScores(
          supabase!,
          user.id,
          () => !disposed && currentUserId.current === user.id,
        );
        if (!disposed) {
          if (count)
            notify(
              `${count} borrador${count === 1 ? "" : "es"} de score sincronizado${count === 1 ? "" : "s"}.`,
            );
          if (
            count ||
            event?.type === "online" ||
            event?.type === NATIVE_NETWORK_CHANGED
          )
            await load(user, true);
        }
      } catch (error) {
        if (!disposed)
          notify(
            error instanceof Error
              ? error.message
              : "Tus borradores siguen en este iPhone. Intenta sincronizarlos más tarde.",
          );
      } finally {
        syncing = false;
      }
    };
    void synchronize();
    window.addEventListener("online", synchronize);
    window.addEventListener(NATIVE_NETWORK_CHANGED, synchronize);
    window.addEventListener("fairway:sync-scores", synchronize);
    window.addEventListener(NATIVE_RESUME, synchronize);
    return () => {
      disposed = true;
      window.removeEventListener("online", synchronize);
      window.removeEventListener(NATIVE_NETWORK_CHANGED, synchronize);
      window.removeEventListener("fairway:sync-scores", synchronize);
      window.removeEventListener(NATIVE_RESUME, synchronize);
    };
  }, [user?.id, load, notify]);
  const refreshRatings = useCallback(async () => {
    const userId = user?.id;
    if (!supabase || !userId) return false;
    try {
      const [summary, reviews] = await Promise.all([
        supabase.rpc("rating_summary"),
        supabase
          .from("reviews")
          .select("game_id,target_id,punctuality,respect,pace,company")
          .eq("reviewer_id", userId),
      ]);
      if (currentUserId.current !== userId || summary.error || reviews.error)
        return false;
      const rows = summary.data as RatingSummary[];
      setRatings(rows);
      setMyReviews(reviews.data as SubmittedReview[]);
      setMe((profile) => withRating(profile, rows));
      setProfiles((profiles) =>
        profiles.map((profile) => withRating(profile, rows)),
      );
      return true;
    } catch {
      return false;
    }
  }, [user?.id]);
  useEffect(() => {
    if (!user || passwordRecovery) return;
    const resume = () => {
      void load(user, true);
    };
    window.addEventListener(NATIVE_RESUME, resume);
    window.addEventListener("fairway:refresh-core", resume);
    return () => {
      window.removeEventListener(NATIVE_RESUME, resume);
      window.removeEventListener("fairway:refresh-core", resume);
    };
  }, [user, passwordRecovery, load]);
  useEffect(() => {
    if (!user || passwordRecovery) return;
    const refresh = () => {
      if (document.hidden) return;
      void refreshRatings();
      if (Date.now() - photosRefreshedAt.current >= PROFILE_PHOTO_REFRESH_MS)
        void load(user, true);
    };
    const timer = setInterval(refresh, PROFILE_PHOTO_REFRESH_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [user, passwordRecovery, refreshRatings, load]);
  const refreshGames = useCallback(async () => {
    const userId = user?.id;
    if (!supabase || !userId) return false;
    const result = await supabase
      .from("games")
      .select("*,participants:game_participants(user_id,status)")
      .order("starts_at");
    if (currentUserId.current !== userId || result.error) return false;
    setGames(result.data as Game[]);
    return true;
  }, [user?.id]);
  const refreshConversations = useCallback(async () => {
    const userId = user?.id;
    if (!supabase || !userId) return;
    const result = await supabase
      .from("conversations")
      .select(conversationSelect);
    if (!result.error && currentUserId.current === userId)
      setConversations(result.data as unknown as Conversation[]);
  }, [user?.id]);
  useEffect(() => {
    const userId = user?.id;
    if (!supabase || !userId) return;
    let current = true;
    const watermarks = incomingWatermarks(messages, userId);
    const pending = conversations.flatMap((conversation) => {
      const member = conversation.conversation_members.find(
        (m) => m.user_id === userId,
      );
      const receivedAt = watermarks.get(conversation.id);
      // Old databases remain usable until the receipts migration is applied.
      if (
        !member ||
        !("last_delivered_at" in member) ||
        !receivedAt ||
        (member.last_delivered_at &&
          Date.parse(member.last_delivered_at) >= Date.parse(receivedAt))
      )
        return [];
      return [{ conversationId: conversation.id, receivedAt }];
    });
    if (!pending.length) return;
    void Promise.all(
      pending.map(async ({ conversationId, receivedAt }) => {
        const result = await supabase!
          .from("conversation_members")
          .update({ last_delivered_at: receivedAt })
          .eq("conversation_id", conversationId)
          .eq("user_id", userId)
          .or(`last_delivered_at.is.null,last_delivered_at.lt.${receivedAt}`);
        return !result.error;
      }),
    ).then((saved) => {
      if (current && saved.some(Boolean)) void refreshConversations();
    });
    return () => {
      current = false;
    };
  }, [messages, conversations, user?.id, refreshConversations]);
  const partyChat = useCallback(
    async (gameId: string) => {
      const userId = user?.id;
      if (!supabase || !userId) {
        notify("Inicia sesión para abrir el chat de la party.");
        return null;
      }
      try {
        const result = await supabase
          .from("conversations")
          .select(conversationSelect)
          .eq("game_id", gameId)
          .maybeSingle();
        if (currentUserId.current !== userId) return null;
        if (result.error || !result.data) throw new Error("Chat no disponible");
        const conversation = result.data as unknown as Conversation;
        setConversations((rows) => [
          ...rows.filter((row) => row.id !== conversation.id),
          conversation,
        ]);
        return conversation.id;
      } catch {
        if (currentUserId.current === userId)
          notify(
            "No pudimos abrir el chat de la party. Revisa tu conexión y que tu lugar esté confirmado.",
          );
        return null;
      }
    },
    [user?.id, notify],
  );
  useEffect(() => {
    if (!user) return;
    const visible = () => {
      if (!document.hidden) void refreshConversations();
    };
    const timer = setInterval(visible, 20000);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [user?.id, refreshConversations]);
  useEffect(() => {
    if (!supabase || !user) return;
    const channel = supabase
      .channel("fairway-" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => void load(user, true),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_members" },
        () => void refreshConversations(),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => void load(user, true),
      )
      .subscribe();
    return () => {
      void supabase!.removeChannel(channel);
    };
  }, [user, load, refreshConversations]);
  async function changePhoto(file: File | null) {
    if (!supabase || !user)
      throw new Error("Inicia sesión para guardar tu fotografía.");
    const userId = user.id;
    const saved = await saveProfilePhoto(supabase, userId, file);
    if (currentUserId.current !== userId)
      throw new Error("Tu sesión cambió. Vuelve a iniciar sesión.");
    photoRevision.current++;
    setError((current) =>
      current.startsWith("Tu foto está guardada,") ? "" : current,
    );
    setMe((profile) => ({
      ...profile,
      photo: saved.photo,
      photo_path: saved.photo_path,
    }));
    notify(
      saved.photo_path && !saved.photo
        ? "Foto guardada, pero no se pudo cargar su vista previa. Recarga la página para reintentar."
        : "Foto de perfil actualizada.",
    );
  }
  async function run(
    fn: () => PromiseLike<{ error: unknown; data?: unknown }>,
    success?: string,
  ) {
    if (isIOSApp(nativeBridge()) && !nativeOnline()) {
      notify(
        "Esta acción necesita conexión. Para anotar en el campo, guarda una tarjeta nueva como borrador privado.",
      );
      return false;
    }
    if (!supabase || !user) {
      notify(
        demo
          ? "Demostración: conecta Supabase e inicia sesión para guardar cambios reales."
          : "Inicia sesión para continuar.",
      );
      return false;
    }
    try {
      const result = await fn();
      if (result.error) {
        notify(
          (result.error as { message?: string }).message ||
            "No se pudo completar la acción.",
        );
        return false;
      }
      if (success) notify(success);
      await load(user, true);
      return true;
    } catch (e) {
      notify(
        e instanceof Error
          ? e.message
          : "Conexión no disponible. Intenta de nuevo.",
      );
      return false;
    }
  }
  async function decide(id: string, choice: string): Promise<boolean> {
    if (demo) {
      setDecided((x) => [...new Set([...x, id])]);
      notify("Demostración: decisión temporal. No se generó un match real.");
      return true;
    }
    if (!supabase || !user) return false;
    const actorId = user.id;
    try {
      const { data, error } = await supabase.rpc("decide", {
        target: id,
        choice,
      });
      if (currentUserId.current !== actorId) return false;
      if (error) {
        notify(error.message);
        return false;
      }
      setDecided((x) => [...new Set([...x, id])]);
      notify(
        data
          ? "¡Es un match! Ya pueden conversar."
          : choice === "like"
            ? "Like enviado. Habrá match si el interés es mutuo."
            : "Perfil omitido.",
      );
      // Keep the deck mounted; refreshing data must not replace it with a skeleton.
      void load(user, true);
      return true;
    } catch {
      if (currentUserId.current === actorId)
        notify(
          "No se pudo guardar la decisión. Revisa tu conexión e inténtalo de nuevo.",
        );
      return false;
    }
  }
  async function favorite(id: string) {
    if (demo) {
      setFavorites((x) =>
        x.includes(id) ? x.filter((i) => i !== id) : [...x, id],
      );
      return;
    }
    await run(() =>
      favorites.includes(id)
        ? supabase!
            .from("favorites")
            .delete()
            .eq("user_id", user!.id)
            .eq("target_id", id)
        : supabase!
            .from("favorites")
            .insert({ user_id: user!.id, target_id: id }),
    );
  }
  return {
    user,
    authReady,
    passwordRecovery,
    authReturnIssue,
    finishPasswordRecovery: () => {
      setPasswordRecovery(false);
      setAuthReturnIssue(null);
    },
    demo,
    loading,
    error,
    toast,
    notify,
    me,
    profiles,
    clubs,
    games,
    rounds,
    decided,
    favorites,
    conversations,
    messages,
    notifications,
    admin,
    publicDirectoryLive,
    needsGoogleProfile,
    nativeCachedAt,
    partiesAvailable,
    ratings,
    myReviews,
    refreshRatings,
    refreshGames,
    refreshConversations,
    partyChat,
    run,
    changePhoto,
    decide,
    favorite,
    reload: () => user && load(user),
    refresh: async () => {
      if (user) return load(user, true);
      if (!supabase) return;
      const result = await supabase
        .from("clubs")
        .select("id,name,city,verified,description,access_info")
        .order("name");
      if (currentUserId.current) return;
      if (result.error)
        notify(
          "No pudimos actualizar los clubes. Revisa tu conexión e intenta de nuevo.",
        );
      else {
        setClubs(result.data as Club[]);
        setPublicDirectoryLive(true);
      }
    },
  };
}
export type FairwayData = ReturnType<typeof useFairway>;
