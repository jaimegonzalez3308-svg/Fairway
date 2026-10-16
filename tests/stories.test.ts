import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  groupStories,
  storyTime,
  storyFromFeedRow,
  type Story,
  type StoryFeedRow,
} from "../lib/stories";

test("actividad conserva las vistas sin like y lee el like anidado de PostgREST", () => {
  const row: StoryFeedRow = {
    id: "story",
    user_id: "author",
    media_path: "author/story.jpg",
    caption: "Golf",
    audience: "members",
    created_at: "2026-10-15T10:00:00Z",
    expires_at: "2026-10-16T10:00:00Z",
    story_views: [
      { user_id: "a", viewed_at: "2026-10-15T11:00:00Z", story_likes: null },
      {
        user_id: "b",
        viewed_at: "2026-10-15T12:00:00Z",
        story_likes: { user_id: "b" },
      },
      {
        user_id: "c",
        viewed_at: "2026-10-15T13:00:00Z",
        story_likes: [{ user_id: "c" }],
      },
    ],
  };
  const story = storyFromFeedRow(row);
  assert.equal(story.story_views.length, 3);
  assert.deepEqual(story.story_likes, [{ user_id: "b" }, { user_id: "c" }]);
  assert.equal(groupStories([story], "a")[0].unseen, false);
  assert.deepEqual(
    storyFromFeedRow({ ...row, story_views: [] }).story_likes,
    [],
  );
});

test("historias: vencimiento, vistas únicas, likes privados y Storage con RLS", async (t) => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb,email text,email_confirmed_at timestamptz,phone text);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users on delete cascade,created_at timestamptz not null);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
 grant usage on schema public,auth,storage to authenticated,anon;create publication supabase_realtime;`);
  for (const file of [
    "202610150001_fairway.sql",
    "202610150002_integrity.sql",
    "202610150003_invitations.sql",
    "202610150004_clubs.sql",
    "202610150005_guest_and_account_security.sql",
    "202610150006_friends.sql",
    "202610150007_stories.sql",
  ])
    await db.exec(
      (
        await readFile(
          new URL("../supabase/migrations/" + file, import.meta.url),
          "utf8",
        )
      ).replace("create extension if not exists pgcrypto;", ""),
    );
  const a = "00000000-0000-4000-8000-000000000001";
  const b = "00000000-0000-4000-8000-000000000002";
  const c = "00000000-0000-4000-8000-000000000003";
  const s1 = "10000000-0000-4000-8000-000000000001";
  const s2 = "10000000-0000-4000-8000-000000000002";
  for (const [id, name] of [
    [a, "Ana Golf"],
    [b, "Bruno Golf"],
    [c, "Carla Golf"],
  ])
    await db.query(
      "insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)",
      [id, JSON.stringify({ name, age: 25 })],
    );
  await db.exec(
    "grant select,insert,delete on storage.objects to authenticated;grant usage on schema storage to authenticated",
  );
  async function as(id: string) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  }
  async function count(table: string) {
    return (
      await db.query<{ n: number }>(`select count(*)::int n from ${table}`)
    ).rows[0].n;
  }
  async function publish(id: string, audience = "members") {
    await as(a);
    await db.query(
      "insert into storage.objects(bucket_id,name) values('story-images',$1)",
      [a + "/" + id + ".jpg"],
    );
    await db.query("select publish_story($1,'Un gran tiro',$2)", [
      id,
      audience,
    ]);
  }
  await t.test(
    "sin acceso anónimo ni publicación sin foto; fechas controladas por servidor",
    async () => {
      await db.exec("set role anon");
      await assert.rejects(
        db.exec("select * from stories"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select view_story($1)", [s1]),
        /permission denied/,
      );
      await as(a);
      await assert.rejects(
        db.query("select publish_story($1)", [s1]),
        /Primero sube/,
      );
      await assert.rejects(
        db.query(
          "insert into stories(id,user_id,media_path) values($1,$2,$3)",
          [s1, a, a + "/" + s1 + ".jpg"],
        ),
        /permission denied/,
      );
      await publish(s1);
      const row = (
        await db.query<{ hours: number }>(
          "select extract(epoch from expires_at-created_at)/3600 as hours from stories",
        )
      ).rows[0];
      assert.equal(Number(row.hours), 24);
      await assert.rejects(
        db.exec("update stories set expires_at=now()+interval '48 hours'"),
        /permission denied/,
      );
    },
  );
  await t.test(
    "Storage privado; no subir a carpetas ajenas ni sobrescribir; solo autor elimina",
    async () => {
      await as(b);
      assert.equal(await count("storage.objects"), 1);
      await assert.rejects(
        db.query(
          "insert into storage.objects(bucket_id,name) values('story-images',$1)",
          [a + "/fake.jpg"],
        ),
        /row-level security/,
      );
      await assert.rejects(
        db.exec("update storage.objects set name='changed'"),
        /permission denied/,
      );
      await db.exec("delete from storage.objects");
      assert.equal(await count("storage.objects"), 1);
      await assert.rejects(
        db.query("select remove_story($1)", [s1]),
        /no disponible/,
      );
    },
  );
  await t.test(
    "vista única, el autor no cuenta; likes idempotentes y reversibles sin falsificar personas",
    async () => {
      await as(a);
      await db.query("select view_story($1)", [s1]);
      assert.equal(await count("story_views"), 0);
      await assert.rejects(
        db.query("select like_story($1,true)", [s1]),
        /No puedes/,
      );
      await as(b);
      await db.query("select view_story($1)", [s1]);
      await db.query("select view_story($1)", [s1]);
      assert.equal(await count("story_views"), 1);
      await db.query("select like_story($1,true)", [s1]);
      await db.query("select like_story($1,true)", [s1]);
      assert.equal(await count("story_likes"), 1);
      await assert.rejects(
        db.query("insert into story_views(story_id,user_id) values($1,$2)", [
          s1,
          c,
        ]),
        /permission denied/,
      );
      await assert.rejects(
        db.exec("update story_likes set user_id='" + c + "'"),
        /permission denied/,
      );
      await as(c);
      assert.equal(await count("story_views"), 0);
      assert.equal(await count("story_likes"), 0);
      await db.query("select like_story($1,true)", [s1]);
      assert.equal(await count("story_views"), 1);
      await as(a);
      assert.equal(await count("story_views"), 2);
      assert.equal(await count("story_likes"), 2);
      await as(b);
      await db.query("select like_story($1,false)", [s1]);
      assert.equal(await count("story_likes"), 0);
      assert.equal(await count("story_views"), 1);
    },
  );
  await t.test(
    "solo amistades aceptadas ven historias para amigos; pendiente no concede acceso",
    async () => {
      await publish(s2, "friends");
      await as(b);
      assert.equal(await count("stories"), 1);
      assert.equal(await count("storage.objects"), 1);
      await assert.rejects(
        db.query("select view_story($1)", [s2]),
        /no está disponible/,
      );
      await db.query("select request_friendship($1)", [a]);
      assert.equal(await count("stories"), 1);
      const relation = (
        await db.query<{ id: string }>("select id from friendships")
      ).rows[0].id;
      await as(a);
      await db.query("select respond_friendship($1,'accept')", [relation]);
      await as(b);
      assert.equal(await count("stories"), 2);
      assert.equal(await count("storage.objects"), 2);
      await db.query("select view_story($1)", [s2]);
      await db.query("select respond_friendship($1,'remove')", [relation]);
      assert.equal(await count("stories"), 1);
      assert.equal(await count("story_views"), 1);
    },
  );
  await t.test(
    "privacidad, bloqueo y suspensión revocan historias, métricas y fotos",
    async () => {
      await as(a);
      await db.query("insert into blocks(user_id,target_id) values($1,$2)", [
        a,
        b,
      ]);
      assert.equal(await count("story_views"), 1); // Carla sigue visible.
      await as(b);
      assert.equal(await count("stories"), 0);
      assert.equal(await count("storage.objects"), 0);
      await assert.rejects(
        db.query("select like_story($1,true)", [s1]),
        /No puedes/,
      );
      await db.exec(
        "reset role;delete from blocks;update profiles set visibility='private' where id='" +
          a +
          "'",
      );
      await as(b);
      assert.equal(await count("stories"), 0);
      assert.equal(await count("storage.objects"), 0);
      await db.exec(
        "reset role;update profiles set visibility='members';update account_roles set suspended=true where user_id='" +
          a +
          "'",
      );
      await as(b);
      assert.equal(await count("stories"), 0);
      await as(a);
      assert.equal(await count("stories"), 0);
      await db.exec("reset role;update account_roles set suspended=false");
    },
  );
  await t.test(
    "vencimiento también bloquea API y Storage; eliminar limpia métricas en cascada",
    async () => {
      await db.exec(
        "reset role;update stories set created_at=now()-interval '25 hours',expires_at=now()-interval '1 hour' where id='" +
          s1 +
          "'",
      );
      await as(b);
      assert.equal(await count("stories"), 0);
      assert.equal(await count("story_views"), 0);
      assert.equal(await count("story_likes"), 0);
      assert.equal(await count("storage.objects"), 0);
      await assert.rejects(
        db.query("select view_story($1)", [s1]),
        /no está disponible/,
      );
      await assert.rejects(
        db.query("select like_story($1,true)", [s1]),
        /No puedes/,
      );
      await as(a);
      await db.query("select remove_story($1)", [s1]);
      await db.exec("reset role");
      assert.equal(await count("story_views"), 1); // vista de la historia para amigos.
      await db.query("delete from auth.users where id=$1", [a]);
      assert.equal(await count("stories"), 0);
      assert.equal(await count("story_views"), 0);
      assert.equal(await count("story_likes"), 0);
    },
  );
  await db.close();
});

test("historias se agrupan cronológicamente y las nuevas aparecen antes de las vistas", () => {
  const make = (
    id: string,
    user_id: string,
    created_at: string,
    viewed = false,
  ) =>
    ({
      id,
      user_id,
      created_at,
      story_views: viewed ? [{ user_id: "me", viewed_at: created_at }] : [],
    }) as Story;
  const groups = groupStories(
    [
      make("3", "seen", "2026-10-15T16:00:00Z", true),
      make("2", "new", "2026-10-15T15:00:00Z"),
      make("1", "new", "2026-10-15T14:00:00Z"),
      make("4", "me", "2026-10-15T13:00:00Z"),
    ],
    "me",
  );
  assert.deepEqual(
    groups.map((g) => g.userId),
    ["me", "new", "seen"],
  );
  assert.deepEqual(
    groups[1].items.map((s) => s.id),
    ["1", "2"],
  );
  assert.equal(
    storyTime("2026-10-15T13:00:00Z", Date.parse("2026-10-15T15:00:00Z")),
    "2 h",
  );
});
