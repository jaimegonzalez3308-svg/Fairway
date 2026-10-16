import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { nameSearchPattern } from "../lib/profile-share";

test("amistades: consentimiento, privacidad, búsqueda y bloqueos en PostgreSQL", async (t) => {
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
  ])
    await db.exec(
      (
        await readFile(
          new URL("../supabase/migrations/" + file, import.meta.url),
          "utf8",
        )
      ).replace("create extension if not exists pgcrypto;", ""),
    );
  const a = "00000000-0000-4000-8000-000000000001",
    b = "00000000-0000-4000-8000-000000000002",
    c = "00000000-0000-4000-8000-000000000003",
    d = "00000000-0000-4000-8000-000000000004";
  for (const [id, name] of [
    [a, "Ana Golf"],
    [b, "Bruno Golf"],
    [c, "Carla Golf"],
    [d, "Golf 100%_literal"],
  ])
    await db.query(
      `insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)`,
      [id, JSON.stringify({ name, age: 25 })],
    );
  async function as(id: string) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  }
  const relation = async () =>
    (
      await db.query<{ id: string; status: string }>(
        "select id,status from friendships",
      )
    ).rows;
  async function request() {
    await as(a);
    await db.query("select request_friendship($1)", [b]);
    return (await relation())[0].id;
  }
  await t.test(
    "anónimo no puede buscar perfiles ni consultar o crear amistades",
    async () => {
      await db.exec("set role anon");
      await assert.rejects(
        db.exec("select * from friendships"),
        /permission denied/,
      );
      await assert.rejects(
        db.exec("select name from profiles"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select request_friendship($1)", [b]),
        /permission denied/,
      );
    },
  );
  let id = "";
  await t.test(
    "solicitud única en ambas direcciones; ni emisor ni tercero pueden aceptarla",
    async () => {
      id = await request();
      await request();
      assert.equal((await relation()).length, 1);
      await assert.rejects(
        db.query("select respond_friendship($1,'accept')", [id]),
        /destinataria/,
      );
      await as(c);
      assert.equal((await relation()).length, 0);
      await assert.rejects(
        db.query("select respond_friendship($1,'accept')", [id]),
        /no disponible/,
      );
      await as(b);
      assert.equal((await relation())[0].status, "pending");
      await assert.rejects(
        db.query("select request_friendship($1)", [a]),
        /Acéptala/,
      );
      await assert.rejects(
        db.query("select request_friendship($1)", [b]),
        /No se puede/,
      );
    },
  );
  await t.test(
    "sin escrituras directas ni modificación de participantes o estado",
    async () => {
      await as(a);
      await assert.rejects(
        db.query(
          `insert into friendships(requester_id,recipient_id,status,accepted_at) values($1,$2,'accepted',now())`,
          [a, c],
        ),
        /permission denied/,
      );
      await assert.rejects(
        db.query(
          "update friendships set status='accepted',accepted_at=now() where id=$1",
          [id],
        ),
        /permission denied/,
      );
      await assert.rejects(
        db.query("delete from friendships where id=$1", [id]),
        /permission denied/,
      );
    },
  );
  await t.test(
    "solo destinatario acepta; ambos ven la amistad y un tercero no la elimina",
    async () => {
      await as(b);
      await db.query("select respond_friendship($1,'accept')", [id]);
      assert.equal((await relation())[0].status, "accepted");
      await as(a);
      assert.equal((await relation())[0].status, "accepted");
      assert.equal(
        (await db.query("select * from notifications where category='friends'"))
          .rows.length,
        1,
      );
      await as(c);
      await assert.rejects(
        db.query("select respond_friendship($1,'remove')", [id]),
        /no disponible/,
      );
      await as(a);
      await db.query("select respond_friendship($1,'remove')", [id]);
      assert.equal((await relation()).length, 0);
    },
  );
  await t.test(
    "cancelar solo emisor; rechazar solo destinatario; no reactivar solicitudes viejas",
    async () => {
      id = await request();
      await as(b);
      await assert.rejects(
        db.query("select respond_friendship($1,'cancel')", [id]),
        /no permitida/,
      );
      await as(a);
      await db.query("select respond_friendship($1,'cancel')", [id]);
      await as(b);
      await assert.rejects(
        db.query("select respond_friendship($1,'accept')", [id]),
        /no disponible/,
      );
      id = await request();
      await assert.rejects(
        db.query("select respond_friendship($1,'reject')", [id]),
        /no permitida/,
      );
      await as(b);
      await db.query("select respond_friendship($1,'reject')", [id]);
      assert.equal((await relation()).length, 0);
    },
  );
  await t.test(
    "bloquear elimina amistades y solicitudes y evita nuevas en ambas direcciones",
    async () => {
      id = await request();
      await as(b);
      await db.query("select respond_friendship($1,'accept')", [id]);
      await db.query("insert into blocks(user_id,target_id) values($1,$2)", [
        b,
        a,
      ]);
      assert.equal((await relation()).length, 0);
      await assert.rejects(
        db.query("select request_friendship($1)", [a]),
        /No se puede/,
      );
      await as(a);
      await assert.rejects(
        db.query("select request_friendship($1)", [b]),
        /No se puede/,
      );
      await db.exec("reset role");
      assert.equal((await relation()).length, 0);
      await db.exec("delete from blocks");
      id = await request();
      await db.query("insert into blocks(user_id,target_id) values($1,$2)", [
        a,
        b,
      ]);
      await db.exec("reset role");
      assert.equal((await relation()).length, 0);
      await db.exec("delete from blocks");
    },
  );
  await t.test(
    "búsqueda por nombre independiente de decisiones; perfiles privados y suspendidos ocultos incluso por QR",
    async () => {
      await db.exec("reset role");
      await db.query("update profiles set visibility='private' where id=$1", [
        b,
      ]);
      await db.query(
        "update account_roles set suspended=true where user_id=$1",
        [c],
      );
      await as(a);
      assert.equal(
        (
          await db.query(
            "select id from profiles where name ilike '%Golf%' and id<>$1",
            [a],
          )
        ).rows.length,
        1,
      );
      assert.equal(
        (await db.query("select * from profiles where id=$1", [b])).rows.length,
        0,
      );
      await assert.rejects(
        db.query("select request_friendship($1)", [b]),
        /No se puede/,
      );
      await assert.rejects(
        db.query("select request_friendship($1)", [c]),
        /No se puede/,
      );
      await db.query("select decide($1,'pass')", [d]);
      assert.equal(
        (
          await db.query("select id from profiles where name ilike $1", [
            nameSearchPattern("100%_"),
          ])
        ).rows.length,
        1,
      );
      await db.exec("reset role");
      await db.exec(
        "update profiles set visibility='members';update account_roles set suspended=false",
      );
    },
  );
  await t.test(
    "la privacidad propia y una cuenta suspendida impiden enviar solicitudes; borrar cuenta limpia relaciones",
    async () => {
      await as(a);
      await db.query("update profiles set visibility='private' where id=$1", [
        a,
      ]);
      await assert.rejects(
        db.query("select request_friendship($1)", [b]),
        /Haz visible/,
      );
      await db.query("update profiles set visibility='members' where id=$1", [
        a,
      ]);
      id = await request();
      await db.exec("reset role");
      await db.query(
        "update account_roles set suspended=true where user_id=$1",
        [a],
      );
      await as(a);
      assert.equal((await relation()).length, 0);
      await assert.rejects(
        db.query("select request_friendship($1)", [c]),
        /No se puede/,
      );
      await db.exec("reset role");
      await db.query("delete from auth.users where id=$1", [a]);
      assert.equal((await relation()).length, 0);
    },
  );
  await db.close();
});
