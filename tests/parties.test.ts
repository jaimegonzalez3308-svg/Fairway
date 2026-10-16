import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  golfDate,
  golfDateAfter,
  matchesPartyPeriod,
  partyDateLabel,
  gameSeats,
  gameIsUpcoming,
} from "../lib/parties";
import type { Game } from "../lib/domain";

test("parties: cupos, incorporación directa, chat, salidas y aprobación en PostgreSQL", async (t) => {
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
    [d, "Diego Golf"],
  ])
    await db.query(
      "insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)",
      [id, JSON.stringify({ name, age: 25 })],
    );
  const club = (await db.query<{ id: string }>("select id from clubs limit 1"))
    .rows[0].id;
  async function as(id: string) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  }
  async function create(mode = "open", privacy = "public", capacity = 3) {
    await as(a);
    return (
      await db.query<{ id: string }>(
        `insert into games(host_id,club_id,starts_at,holes,capacity,format,kind,description,access_conditions,join_mode,privacy) values($1,$2,now()+interval '7 days',18,$3,'Casual','social','La próxima semana','Gestionar acceso con el club',$4,$5) returning id`,
        [a, club, capacity, mode, privacy],
      )
    ).rows[0].id;
  }
  const join = (id: string) => db.query("select request_join($1)", [id]);
  const leave = (id: string) => db.query("select leave_game($1)", [id]);
  const membership = async (id: string, user: string) =>
    (
      await db.query<{ status: string }>(
        "select status from game_participants where game_id=$1 and user_id=$2",
        [id, user],
      )
    ).rows[0]?.status;
  const state = async (id: string) =>
    (
      await db.query<{ status: string }>(
        "select status from games where id=$1",
        [id],
      )
    ).rows[0]?.status;
  const count = async (id: string) =>
    (
      await db.query<{ n: number }>(
        "select count(*)::int n from game_participants where game_id=$1 and status='confirmed'",
        [id],
      )
    ).rows[0].n;
  const party = await create();
  let chat = "";
  await t.test(
    "las parties abiertas deben ser públicas; anónimos no se incorporan",
    async () => {
      await assert.rejects(create("open", "invite"), /check constraint/);
      await db.exec("reset role;set role anon");
      await assert.rejects(join(party), /permission denied/);
      await assert.rejects(leave(party), /permission denied/);
    },
  );
  await t.test(
    "cualquier miembro se confirma para dentro de una semana sin match y entra al chat",
    async () => {
      await as(b);
      await join(party);
      assert.equal(await membership(party, b), "confirmed");
      assert.equal(await count(party), 2);
      chat = (
        await db.query<{ id: string }>(
          "select id from conversations where game_id=$1",
          [party],
        )
      ).rows[0].id;
      await db.query("select send_message($1,'Nos vemos en el tee')", [chat]);
      await join(party);
      assert.equal(await count(party), 2);
      assert.equal(
        (
          await db.query(
            "select * from conversation_members where conversation_id=$1 and user_id=$2",
            [chat, b],
          )
        ).rows.length,
        1,
      );
      await assert.rejects(
        db.query(
          "insert into game_participants(game_id,user_id,status) values($1,$2,'confirmed')",
          [party, d],
        ),
        /permission denied/,
      );
    },
  );
  await t.test(
    "el último lugar cierra la party y no admite sobrecupo ni duplicados",
    async () => {
      await as(c);
      await join(party);
      assert.equal(await count(party), 3);
      assert.equal(await state(party), "full");
      await join(party);
      assert.equal(await count(party), 3);
      await as(d);
      await assert.rejects(join(party), /completa/);
      assert.equal(await count(party), 3);
      assert.equal(
        (
          await db.query("select * from conversations where game_id=$1", [
            party,
          ])
        ).rows.length,
        0,
      );
    },
  );
  await t.test(
    "salir libera el lugar, reabre la party y revoca el chat; otro miembro puede ocuparlo",
    async () => {
      await as(b);
      await leave(party);
      assert.equal(await membership(party, b), undefined);
      assert.equal(await state(party), "open");
      assert.equal(await count(party), 2);
      await assert.rejects(
        db.query("select send_message($1,'Ya salí')", [chat]),
        /no autorizada/,
      );
      assert.equal(
        (
          await db.query("select * from messages where conversation_id=$1", [
            chat,
          ])
        ).rows.length,
        0,
      );
      await leave(party); // idempotente
      await as(d);
      await join(party);
      assert.equal(await state(party), "full");
      assert.equal(await count(party), 3);
      await as(b);
      await assert.rejects(join(party), /completa/);
      await as(a);
      await assert.rejects(leave(party), /organizador/);
      await as(d);
      await leave(party);
      await as(b);
      await join(party);
      assert.equal(await membership(party, b), "confirmed");
    },
  );
  await t.test(
    "las partidas anteriores conservan aprobación; se puede cancelar la solicitud",
    async () => {
      const id = await create("request");
      await as(b);
      await join(id);
      assert.equal(await membership(id, b), "requested");
      assert.equal(
        (await db.query("select * from conversations where game_id=$1", [id]))
          .rows.length,
        0,
      );
      await leave(id);
      assert.equal(await membership(id, b), undefined);
      await join(id);
      await as(a);
      await db.query("select manage_game($1,$2,'confirmed')", [id, b]);
      await as(b);
      assert.equal(await membership(id, b), "confirmed");
      await as(c);
      await join(id);
      await as(a);
      await db.query("select manage_game($1,$2,'rejected')", [id, c]);
      await as(c);
      await assert.rejects(join(id), /no fue aceptada/);
      await assert.rejects(leave(id), /No tienes/);
    },
  );
  await t.test(
    "los bloqueos y suspensiones impiden incorporarse; invitaciones siguen siendo privadas",
    async () => {
      const id = await create();
      await as(b);
      await join(id);
      await db.query("insert into blocks(user_id,target_id) values($1,$2)", [
        b,
        c,
      ]);
      await as(c);
      await assert.rejects(join(id), /este grupo/);
      await db.exec(
        "reset role;delete from blocks;update account_roles set suspended=true where user_id='" +
          c +
          "'",
      );
      await as(c);
      await assert.rejects(join(id), /Inicia sesión/);
      await db.exec("reset role;update account_roles set suspended=false");
      const privateId = await create("request", "invite");
      await as(c);
      await assert.rejects(join(privateId), /no disponible/);
      await as(a);
      await db.query("select invite_to_game($1,$2)", [privateId, c]);
      await as(c);
      await join(privateId);
      assert.equal(await membership(privateId, c), "requested");
      await db.exec(
        "reset role;update account_roles set suspended=true where user_id='" +
          a +
          "'",
      );
      await as(d);
      await assert.rejects(join(id), /no disponible/);
      await db.exec("reset role;update account_roles set suspended=false");
    },
  );
  await t.test(
    "no se admiten incorporaciones ni salidas tras empezar, cancelar o finalizar",
    async () => {
      for (const status of ["open", "cancelled", "finished"]) {
        const id = await create();
        await as(b);
        await join(id);
        await db.exec("reset role");
        await db.query(
          "update games set status=$2,starts_at=case when $2='open' then now()-interval '1 hour' else starts_at end where id=$1",
          [id, status],
        );
        await as(c);
        await assert.rejects(join(id), /no disponible/);
        await as(b);
        await assert.rejects(leave(id), /partida futura/);
      }
    },
  );
  await db.close();
});

test("filtros y fechas de parties usan León y permiten planes de semanas futuras", () => {
  const now = new Date("2026-10-16T05:30:00Z"); // Aún es 15 de octubre en León.
  assert.equal(golfDate(now), "2026-10-15");
  assert.equal(golfDateAfter(7, now), "2026-10-22");
  const game = (day: string) =>
    ({
      starts_at: day + "T08:00:00-06:00",
      status: "open",
      capacity: 4,
      participants: [{ user_id: "a", status: "confirmed" }],
    }) as Game;
  const next = game("2026-10-22");
  assert.equal(matchesPartyPeriod(next, "week", "", now), false);
  assert.equal(matchesPartyPeriod(next, "next-week", "", now), true);
  assert.equal(
    matchesPartyPeriod(game("2026-10-29"), "next-week", "", now),
    false,
  );
  assert.equal(matchesPartyPeriod(next, "date", "2026-10-22", now), true);
  assert.equal(matchesPartyPeriod(next, "today", "", now), false);
  assert.equal(partyDateLabel(next.starts_at, now), "En 7 días");
  assert.deepEqual(gameSeats(next), { confirmed: 1, remaining: 3 });
  assert.equal(gameIsUpcoming(next, now), true);
  assert.equal(gameIsUpcoming({ ...next, status: "cancelled" }, now), false);
  assert.equal(
    golfDateAfter(7, new Date("2026-12-29T12:00:00-06:00")),
    "2027-01-05",
  );
});
