import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { JSDOM } from "jsdom";
import {
  queuedScoreSchema,
  queueScoreDraft,
  readQueuedScores,
  discardQueuedScore,
  syncQueuedScores,
  offlineStorage,
  saveOfflineSnapshot,
  readOfflineSnapshot,
  clearOfflineData,
} from "../lib/native-offline";
import { createSecureStorage } from "../lib/native-device";
import { demoMe, clubs } from "../lib/demo";
import type { SupabaseClient } from "@supabase/supabase-js";

function draft(userId: string) {
  return {
    id: randomUUID(),
    user_id: userId,
    club_id: null,
    tee_id: null,
    played_at: "2026-11-02",
    holes: 9 as const,
    tee: "Blancas",
    course: "Mi campo",
    notes: "",
    status: "draft" as const,
    privacy: "private" as const,
    verified: false as const,
    scores: Array.from({ length: 9 }, (_, i) => ({
      hole: i + 1,
      par: null,
      strokes: null,
    })),
  };
}

test("Keychain migration writes before removing the old session and never falls back after a vault failure", async () => {
  const secure = new Map<string, string>();
  const legacy = new Map([["session", "old-token"]]);
  let failing = true;
  const storage = createSecureStorage(
    {
      get: async ({ key }) => ({ value: secure.get(key) ?? null }),
      set: async ({ key, value }) => {
        if (failing) throw new Error("Locked");
        secure.set(key, value);
      },
      remove: async ({ key }) => {
        secure.delete(key);
      },
    },
    {
      getItem: (key) => legacy.get(key) ?? null,
      removeItem: (key) => {
        legacy.delete(key);
      },
    },
  );
  await assert.rejects(storage.getItem("session"), /Locked/);
  assert.equal(legacy.get("session"), "old-token");
  assert.equal(secure.size, 0);
  failing = false;
  assert.equal(await storage.getItem("session"), "old-token");
  assert.equal(legacy.size, 0);
  await storage.setItem("session", "refreshed-token");
  assert.equal(secure.get("session"), "refreshed-token");
  assert.equal(legacy.size, 0);
  legacy.set("session", "stale-copy");
  assert.equal(await storage.getItem("session"), "refreshed-token");
  assert.equal(legacy.size, 0);
  await storage.removeItem("session");
  assert.equal(await storage.getItem("session"), null);
});

test("offline drafts are isolated by account, serialize concurrent saves and retry without duplicate scores", async (t) => {
  const dom = new JSDOM("", { url: "https://local.test/" });
  Object.assign(dom.window, { Capacitor: { getPlatform: () => "ios" } });
  const globals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    Event: dom.window.Event,
  })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  t.after(() => {
    dom.window.close();
    for (const [key, descriptor] of globals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  const stored = new Map<string, string>();
  t.mock.method(offlineStorage, "get", async ({ key }: { key: string }) => ({
    value: stored.get(key) ?? null,
  }));
  t.mock.method(
    offlineStorage,
    "set",
    async ({ key, value }: { key: string; value: string }) => {
      stored.set(key, value);
    },
  );
  t.mock.method(offlineStorage, "remove", async ({ key }: { key: string }) => {
    stored.delete(key);
  });
  const user = randomUUID(),
    other = randomUUID();
  const first = draft(user),
    second = draft(user);
  await Promise.all([
    queueScoreDraft(first, user),
    queueScoreDraft(second, user),
  ]);
  assert.equal((await readQueuedScores(user)).length, 2);
  assert.deepEqual(await readQueuedScores(other), []);
  await assert.rejects(queueScoreDraft(first, other), /sesión/);
  for (const changes of [
    { privacy: "public" },
    { status: "published" },
    { verified: true },
    { scores: [] },
    { holes: 18 },
    { user_id: "bad-id" },
  ])
    assert.equal(
      queuedScoreSchema.safeParse({ ...first, ...changes }).success,
      false,
    );
  let current = true;
  let fail = true;
  const persisted = new Set<string>();
  const client = {
    from: (table: string) => {
      assert.equal(table, "rounds");
      return {
        insert: (row: ReturnType<typeof draft>) => ({
          abortSignal: async () => {
            if (persisted.has(row.id)) return { error: { code: "23505" } };
            persisted.add(row.id);
            return { error: fail ? { code: "network" } : null };
          },
        }),
        select: () => {
          const query = {
            eq: () => query,
            abortSignal: () => ({
              maybeSingle: async () => ({
                data: { id: first.id },
                error: null,
              }),
            }),
          };
          return query;
        },
      };
    },
  } as unknown as SupabaseClient;
  await assert.rejects(
    syncQueuedScores(client, user, () => current),
    /sincronizó/,
  );
  assert.equal(
    (await readQueuedScores(user)).length,
    2,
    "a lost acknowledgement keeps the local draft",
  );
  fail = false;
  assert.equal(await syncQueuedScores(client, user, () => current), 2);
  assert.equal(persisted.size, 2, "the retry does not create another row");
  assert.deepEqual(await readQueuedScores(user), []);
  await queueScoreDraft(first, user);
  current = false;
  assert.equal(await syncQueuedScores(client, user, () => current), 0);
  assert.equal(
    (await readQueuedScores(user)).length,
    1,
    "an account change stops the queue",
  );
  await discardQueuedScore(first.id, user);
  assert.deepEqual(await readQueuedScores(user), []);
  const own = {
    ...demoMe,
    id: user,
    photo: "signed-url",
    photo_path: "private/path",
    gallery: ["private-photo"],
  };
  await saveOfflineSnapshot({
    userId: user,
    savedAt: Date.now(),
    me: own,
    clubs,
    rounds: [first],
  });
  const cached = await readOfflineSnapshot(user);
  assert.ok(cached);
  assert.equal(cached.me.photo, "");
  assert.equal(cached.me.photo_path, undefined);
  assert.deepEqual(cached.me.gallery, []);
  assert.equal(await readOfflineSnapshot(other), null);
  const snapshotKey = "offline.snapshot.v1";
  stored.set(
    snapshotKey,
    JSON.stringify({
      ...JSON.parse(stored.get(snapshotKey)!),
      savedAt: Date.now() - 25 * 3600000,
    }),
  );
  assert.equal(
    await readOfflineSnapshot(user),
    null,
    "cache older than 24h is rejected",
  );
  await clearOfflineData();
  assert.equal(stored.size, 0);
  current = true;
  const third = draft(user),
    fourth = draft(user);
  await queueScoreDraft(third, user);
  let entered!: () => void, release!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const slow = {
    from: () => ({
      insert: (row: ReturnType<typeof draft>) => ({
        abortSignal: async () => {
          if (row.id === third.id) {
            entered();
            await waiting;
          }
          return { error: null };
        },
      }),
    }),
  } as unknown as SupabaseClient;
  const syncing = syncQueuedScores(slow, user, () => current);
  await started;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      queueScoreDraft(fourth, user),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Network sync blocked a local save")),
          1000,
        );
      }),
    ]);
    assert.equal((await readQueuedScores(user)).length, 2);
  } finally {
    clearTimeout(timer);
    release();
  }
  assert.equal(
    await syncing,
    2,
    "drafts added during a sync are drained in the same run",
  );
  assert.deepEqual(await readQueuedScores(user), []);
  await clearOfflineData();
});
