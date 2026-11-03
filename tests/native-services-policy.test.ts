import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

test("native services enforce adult Apple onboarding and protect device registration and delivery", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;create schema storage;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb,raw_app_meta_data jsonb,email text,email_confirmed_at timestamptz,phone text);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users on delete cascade,created_at timestamptz not null);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
    grant usage on schema public,auth,storage to authenticated,anon,service_role;create publication supabase_realtime;`);
  const dir = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(dir))
    .filter((value) => value.endsWith(".sql"))
    .sort())
    await db.exec(
      (await readFile(new URL(file, dir), "utf8")).replace(
        "create extension if not exists pgcrypto;",
        "",
      ),
    );
  const alice = randomUUID(),
    bob = randomUUID(),
    apple = randomUUID();
  await db.query(
    `insert into auth.users(id,raw_user_meta_data,raw_app_meta_data) values
    ($1,'{"name":"Alice Golf","age":30}','{"provider":"email"}'),
    ($2,'{"name":"Bob Golf","age":30}','{"provider":"email"}'),
    ($3,'{"age":90,"verified":true,"is_admin":true}','{"provider":"apple"}')`,
    [alice, bob, apple],
  );
  async function as(id: string, role = "authenticated") {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec(`set role ${role}`);
  }
  await t.test(
    "Apple cannot read private data or skip age and consent",
    async () => {
      await as(apple);
      assert.equal(
        (
          await db.query<{ active: boolean }>(
            "select public.active_user() as active",
          )
        ).rows[0].active,
        false,
      );
      await assert.rejects(
        db.query("select public.complete_apple_signup('Apple Golf',17,true)"),
        /18/,
      );
      await assert.rejects(
        db.query("select public.complete_apple_signup('Apple Golf',25,false)"),
        /privacidad/,
      );
      await db.query(
        "select public.complete_apple_signup('Apple Golf',25,true)",
      );
      await assert.rejects(
        db.query("select public.delete_my_account()"),
        /Apple/,
      );
      assert.equal(
        (
          await db.query<{ active: boolean }>(
            "select public.active_user() as active",
          )
        ).rows[0].active,
        true,
      );
      await db.exec("reset role");
      const profile = (
        await db.query<{ age: number; verified: boolean; is_admin: boolean }>(
          "select p.age,p.verified,a.is_admin from profiles p join account_roles a on a.user_id=p.id where p.id=$1",
          [apple],
        )
      ).rows[0];
      assert.deepEqual(profile, { age: 25, verified: false, is_admin: false });
      await as(alice);
      await assert.rejects(
        db.query("select public.complete_apple_signup('Fake Apple',25,true)"),
        /Apple/,
      );
    },
  );
  const installation = randomUUID(),
    second = randomUUID();
  const secret = randomUUID() + randomUUID();
  await t.test(
    "only configured services can register; clients cannot enable services or read tokens",
    async () => {
      await as(alice);
      await assert.rejects(
        db.query("select public.register_native_push($1,$2,$3,'sandbox')", [
          installation,
          "ab".repeat(32),
          secret,
        ]),
        /no disponibles/,
      );
      await assert.rejects(
        db.exec("update native_service_configuration set push_ready=true"),
        /permission denied/,
      );
      await assert.rejects(
        db.exec("select * from native_push_devices"),
        /permission denied/,
      );
      await db.exec(
        "reset role;update native_service_configuration set push_ready=true",
      );
      await as(alice);
      await db.query("select public.register_native_push($1,$2,$3,'sandbox')", [
        installation,
        "ab".repeat(32),
        secret,
      ]);
      await as(bob);
      await assert.rejects(
        db.query("select public.register_native_push($1,$2,$3,'sandbox')", [
          installation,
          "cd".repeat(32),
          "x".repeat(64),
        ]),
        /no válido/,
      );
      await db.query(
        "select public.register_native_push($1,$2,$3,'production')",
        [second, "cd".repeat(32), "y".repeat(64)],
      );
    },
  );
  await t.test(
    "delivery honors recipient, unread status, preferences and suspension, with bounded retries",
    async () => {
      await db.exec("reset role");
      await db.query(
        "insert into notifications(user_id,title,category) values($1,'PRIVATE MESSAGE TEXT','messages'),($2,'PRIVATE GAME TEXT','games')",
        [alice, bob],
      );
      await db.query(
        "insert into notification_preferences(user_id,category,enabled) values($1,'messages',false)",
        [alice],
      );
      await db.query(
        "update account_roles set suspended=true where user_id=$1",
        [bob],
      );
      await as("", "service_role");
      assert.deepEqual(
        (await db.query("select * from public.claim_native_push()")).rows,
        [],
      );
      await db.exec("reset role");
      await db.query(
        "update account_roles set suspended=false where user_id=$1",
        [bob],
      );
      await as("", "service_role");
      const rows = (
        await db.query<{ device_id: string; category: string }>(
          "select * from public.claim_native_push()",
        )
      ).rows;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].device_id, second);
      assert.equal(rows[0].category, "games");
      assert.equal(JSON.stringify(rows).includes("PRIVATE"), false);
      assert.equal(
        (await db.query("select * from public.claim_native_push()")).rows
          .length,
        0,
        "lease prevents immediate retries",
      );
      for (let attempt = 0; attempt < 4; attempt++) {
        await db.exec(
          "update native_push_outbox set available_at=now()-interval '1 second'",
        );
        assert.equal(
          (await db.query("select * from public.claim_native_push()")).rows
            .length,
          1,
        );
      }
      await db.exec(
        "update native_push_outbox set available_at=now()-interval '1 second'",
      );
      assert.equal(
        (await db.query("select * from public.claim_native_push()")).rows
          .length,
        0,
        "fifth attempt is the cap",
      );
      await db.exec("reset role");
      await db.query("update notifications set read=true where user_id=$1", [
        bob,
      ]);
      await db.exec("update native_push_outbox set attempts=0");
      await as("", "service_role");
      assert.equal(
        (await db.query("select * from public.claim_native_push()")).rows
          .length,
        0,
        "read activity is not delivered later",
      );
    },
  );
  await t.test(
    "offline sign-out revocation requires the secret and can run without a user session",
    async () => {
      await as("", "anon");
      await db.query("select public.revoke_native_push($1,'wrong')", [
        installation,
      ]);
      await db.exec("reset role");
      assert.equal(
        (
          await db.query(
            "select * from native_push_devices where installation_id=$1",
            [installation],
          )
        ).rows.length,
        1,
      );
      await as("", "anon");
      await db.query("select public.revoke_native_push($1,$2)", [
        installation,
        secret,
      ]);
      await db.exec("reset role");
      assert.equal(
        (
          await db.query(
            "select * from native_push_devices where installation_id=$1",
            [installation],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "select * from native_push_devices where installation_id=$1",
            [second],
          )
        ).rows.length,
        1,
      );
    },
  );
});
