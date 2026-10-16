import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("moderación: send_message bloquea, marca o deja pasar mensajes en PostgreSQL", async (t) => {
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
    "202610160008_open_parties.sql",
    "202610160009_moderation.sql",
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
  await db.query(
    "insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)",
    [a, JSON.stringify({ name: "Ana Golf", age: 25 })],
  );
  const club = (await db.query<{ id: string }>("select id from clubs limit 1"))
    .rows[0].id;
  async function as(id: string) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  }
  await as(a);
  const party = (
    await db.query<{ id: string }>(
      `insert into games(host_id,club_id,starts_at,holes,capacity,format,kind,description,access_conditions,join_mode,privacy) values($1,$2,now()+interval '7 days',18,3,'Casual','social','La próxima semana','Gestionar acceso con el club','open','public') returning id`,
      [a, club],
    )
  ).rows[0].id;
  const chat = (
    await db.query<{ id: string }>(
      "select id from conversations where game_id=$1",
      [party],
    )
  ).rows[0].id;
  const send = (body: string) =>
    db.query("select send_message($1,$2)", [chat, body]);
  const sent = async (body: string) =>
    (
      await db.query("select 1 from messages where body=$1", [body.trim()])
    ).rows.length === 1;
  async function flagged(body: string) {
    await db.exec("reset role");
    const row = (
      await db.query<{ category: string }>(
        "select category from moderation_flags where excerpt=$1",
        [body.trim()],
      )
    ).rows[0];
    await as(a);
    return row?.category;
  }

  await t.test("los mensajes explícitos no se envían", async () => {
    for (const body of [
      "Mándame nudes",
      "nuuuudes",
      "quiero coger contigo",
      "cuánto cobras?",
      "Sexting?",
      "ven a mi cuarto, estoy encuerada",
    ]) {
      await assert.rejects(send(body), /reglas de la comunidad/, body);
      assert.equal(await sent(body), false, body);
    }
  });

  await t.test("los mensajes dudosos se envían y quedan marcados", async () => {
    for (const [body, category] of [
      ["eres un pendejo", "insulto"],
      ["n4lg4s", "vulgar_sexual"],
      ["soy menor de edad", "menores"],
      ["vamos a coger", "solicitud_ambigua"],
    ]) {
      await send(body);
      assert.equal(await sent(body), true, body);
      assert.equal(await flagged(body), category, body);
    }
  });

  await t.test("los mensajes normales de golf pasan sin marca", async () => {
    for (const body of [
      "vamos a coger el carrito",
      "hay descuento en pelotas de golf",
      "me quedé sin pelotas en el hoyo 7",
      "vamos al hoyo 19 por unas chelas",
      "n.u.d.e.s",
    ]) {
      await send(body);
      assert.equal(await sent(body), true, body);
      assert.equal(await flagged(body), undefined, body);
    }
  });

  await t.test("usuarios normales no ven las reglas ni las marcas", async () => {
    await as(a);
    // En Supabase la tabla tiene grant y RLS devuelve 0 filas; aquí no hay grant.
    for (const table of ["moderation_terms", "moderation_flags"]) {
      const rows = await db
        .query(`select * from ${table}`)
        .then((r) => r.rows.length)
        .catch((e: Error) => {
          assert.match(e.message, /permission denied/);
          return 0;
        });
      assert.equal(rows, 0, table);
    }
    await assert.rejects(
      db.query("select public.moderation_check('nudes')"),
      /permission denied/,
    );
  });
});
