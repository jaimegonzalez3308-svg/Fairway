import { z } from "zod";
import type { Club, Profile, Round } from "./domain";
import { NativeDevice } from "./native-device";
import { isIOSApp, nativeBridge } from "./native-app";
import type { SupabaseClient } from "@supabase/supabase-js";
import { nativeOnline } from "./native-network";

export const NATIVE_OFFLINE_CHANGED = "fairway:offline-changed";
const cacheKey = "offline.snapshot.v1";
const queueKey = "offline.scores.v1";
const maxAge = 24 * 60 * 60 * 1000;
const project = process.env.NEXT_PUBLIC_SUPABASE_URL || "demo";
export const offlineStorage = {
  get: (options: { key: string }) => NativeDevice.get(options),
  set: (options: { key: string; value: string }) => NativeDevice.set(options),
  remove: (options: { key: string }) => NativeDevice.remove(options),
};
const hole = z.object({
  hole: z.number().int().min(1).max(18),
  par: z.number().int().min(3).max(6).nullable(),
  strokes: z.number().int().min(1).max(30).nullable(),
  putts: z.number().int().min(0).max(30).nullable().optional(),
  fairway: z.boolean().nullable().optional(),
  gir: z.boolean().nullable().optional(),
  distance: z.number().nonnegative().nullable().optional(),
  index: z.number().int().min(1).max(18).nullable().optional(),
});
export const queuedScoreSchema = z
  .object({
    id: z.uuid(),
    user_id: z.uuid(),
    club_id: z.uuid().nullable(),
    tee_id: z.uuid().nullable(),
    played_at: z.iso.date(),
    holes: z.union([z.literal(9), z.literal(18)]),
    tee: z.string().max(100),
    course: z.string().max(200),
    notes: z.string().max(2000),
    scores: z.array(hole).min(9).max(18),
    status: z.literal("draft"),
    privacy: z.literal("private"),
    verified: z.literal(false),
  })
  .superRefine((value, ctx) => {
    if (
      value.scores.length !== value.holes ||
      value.scores.some((h, i) => h.hole !== i + 1)
    )
      ctx.addIssue({
        code: "custom",
        message: "Revisa los hoyos del borrador.",
      });
  });
export type QueuedScore = z.infer<typeof queuedScoreSchema>;
export type OfflineSnapshot = {
  userId: string;
  savedAt: number;
  me: Profile;
  clubs: Club[];
  rounds: Round[];
};
const changed = () => window.dispatchEvent(new Event(NATIVE_OFFLINE_CHANGED));
// Serialize all read-modify-write operations, including sync and discard.
let operation: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>) {
  const next = operation.then(fn, fn);
  operation = next.catch(() => {});
  return next;
}
async function read<T>(key: string): Promise<T | null> {
  const { value } = await offlineStorage.get({ key });
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
export function saveOfflineSnapshot(
  value: OfflineSnapshot,
  isCurrent: () => boolean = () => true,
) {
  if (!isIOSApp(nativeBridge())) return Promise.resolve();
  // Never cache other members, signed photos, chats, stories, or permissions.
  const snapshot = {
    ...value,
    project,
    me: { ...value.me, photo: "", photo_path: undefined, gallery: [] },
    clubs: value.clubs
      .slice(0, 100)
      .map(({ id, name, city, verified, description, access_info }) => ({
        id,
        name,
        city,
        verified,
        description,
        access_info,
      })),
    rounds: value.rounds.filter((r) => r.user_id === value.userId).slice(-100),
  };
  return serialize(async () => {
    if (isCurrent())
      await offlineStorage.set({
        key: cacheKey,
        value: JSON.stringify(snapshot),
      });
  });
}
export async function readOfflineSnapshot(
  userId: string,
): Promise<OfflineSnapshot | null> {
  const snapshot = await read<OfflineSnapshot & { project: string }>(cacheKey);
  if (
    !snapshot ||
    snapshot.project !== project ||
    snapshot.userId !== userId ||
    snapshot.me?.id !== userId ||
    !Array.isArray(snapshot.clubs) ||
    !Array.isArray(snapshot.rounds) ||
    !Number.isFinite(snapshot.savedAt) ||
    snapshot.savedAt > Date.now() ||
    Date.now() - snapshot.savedAt > maxAge
  )
    return null;
  return snapshot;
}
export async function readQueuedScores(userId: string) {
  const envelope = await read<{
    project: string;
    userId: string;
    rows: unknown[];
  }>(queueKey);
  if (
    envelope?.project !== project ||
    envelope.userId !== userId ||
    !Array.isArray(envelope.rows)
  )
    return [];
  return envelope.rows.flatMap((row) => {
    const result = queuedScoreSchema.safeParse(row);
    return result.success && result.data.user_id === userId
      ? [result.data]
      : [];
  });
}
export function queueScoreDraft(value: unknown, userId: string) {
  return serialize(async () => {
    const draft = queuedScoreSchema.parse(value);
    if (draft.user_id !== userId)
      throw new Error("Tu sesión cambió. No se guardó el borrador.");
    const rows = await readQueuedScores(userId);
    if (rows.length >= 20 && !rows.some((r) => r.id === draft.id))
      throw new Error(
        "Sincroniza tus 20 borradores pendientes antes de agregar otro.",
      );
    await writeQueue(userId, [...rows.filter((r) => r.id !== draft.id), draft]);
    changed();
    return draft;
  });
}
export function discardQueuedScore(id: string, userId: string) {
  return serialize(async () => {
    const rows = await readQueuedScores(userId);
    await writeQueue(
      userId,
      rows.filter((r) => r.id !== id),
    );
    changed();
  });
}
export function clearOfflineData() {
  return serialize(async () => {
    await offlineStorage.remove({ key: cacheKey });
    await offlineStorage.remove({ key: queueKey });
    changed();
  });
}
const activeSync = new Map<
  string,
  { promise: Promise<number>; isCurrent: () => boolean }
>();
export function syncQueuedScores(
  client: SupabaseClient,
  userId: string,
  isCurrent: () => boolean,
) {
  const existing = activeSync.get(userId);
  if (existing?.isCurrent()) return existing.promise;
  const pending = (async () => {
    let saved = 0;
    while (isCurrent() && nativeOnline()) {
      const row = await serialize(
        async () => (await readQueuedScores(userId))[0],
      );
      if (!row || !isCurrent()) break;
      // Stable client UUID makes a retry safe after a lost server response.
      // Network waits never hold the lock needed to save another local draft.
      const result = await client
        .from("rounds")
        .insert(row)
        .abortSignal(AbortSignal.timeout(12000));
      if (!isCurrent()) break;
      if (result.error) {
        if (result.error.code !== "23505")
          throw new Error(
            "No se sincronizó un borrador. Revisa tu conexión o sus datos e inténtalo de nuevo.",
          );
        const existing = await client
          .from("rounds")
          .select("id")
          .eq("id", row.id)
          .eq("user_id", userId)
          .abortSignal(AbortSignal.timeout(12000))
          .maybeSingle();
        if (existing.error || !existing.data)
          throw new Error(
            "No se pudo confirmar el borrador. Se conserva en este iPhone.",
          );
      }
      if (!isCurrent()) break;
      await serialize(async () => {
        if (!isCurrent()) return;
        const remaining = await readQueuedScores(userId);
        await writeQueue(
          userId,
          remaining.filter((r) => r.id !== row.id),
        );
        saved++;
        changed();
      });
    }
    return saved;
  })().finally(() => {
    if (activeSync.get(userId)?.promise === pending) activeSync.delete(userId);
    changed();
  });
  activeSync.set(userId, { promise: pending, isCurrent });
  return pending;
}

function writeQueue(userId: string, rows: QueuedScore[]) {
  return offlineStorage.set({
    key: queueKey,
    value: JSON.stringify({ project, userId, rows }),
  });
}
