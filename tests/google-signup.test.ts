import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { initialSignupCity } from "../lib/signup-city";

test("Google: alta sin edad y activación protegida por PostgreSQL", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb,raw_app_meta_data jsonb,email text,email_confirmed_at timestamptz,phone text);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users on delete cascade,created_at timestamptz not null);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
    grant usage on schema public,auth,storage to authenticated,anon;create publication supabase_realtime;`);
  const dir = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(dir))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(
      (await readFile(new URL(file, dir), "utf8")).replace(
        "create extension if not exists pgcrypto;",
        "",
      ),
    );
  }
  const emailUser = randomUUID(),
    googleUser = randomUUID();
  await db.query(
    `insert into auth.users(id,raw_user_meta_data,raw_app_meta_data) values
    ($1,'{"name":"Ana Golf","age":25}','{"provider":"email"}'),
    ($2,'{"full_name":"Bruno Golf","age":99,"is_admin":true,"verified":true}','{"provider":"google"}')`,
    [emailUser, googleUser],
  );
  const as = async (id: string, role = "authenticated") => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role " + role);
  };
  const complete = (
    name: string | null,
    age: number | null,
    consent: boolean | null,
  ) =>
    db.query("select complete_google_signup($1,$2,$3)", [name, age, consent]);

  await t.test(
    "Google no inventa edad, perfil ni permisos, y no puede leer perfiles",
    async () => {
      assert.equal(
        (await db.query("select * from profiles where id=$1", [googleUser]))
          .rows.length,
        0,
      );
      assert.equal(
        (
          await db.query("select * from account_roles where user_id=$1", [
            googleUser,
          ])
        ).rows.length,
        0,
      );
      await as(googleUser);
      assert.equal(
        (await db.query<{ active: boolean }>("select active_user() active"))
          .rows[0].active,
        false,
      );
      assert.equal((await db.query("select * from profiles")).rows.length, 0);
      await assert.rejects(
        db.query(
          "insert into profiles(id,name,age) values($1,'Bruno Golf',25)",
          [googleUser],
        ),
        /permission denied|row-level security/,
      );
    },
  );
  await t.test(
    "edad y consentimiento se comprueban incluso al llamar al RPC directamente",
    async () => {
      for (const age of [null, 17, 101])
        await assert.rejects(
          complete("Bruno Golf", age, true),
          /entre 18 y 100/,
        );
      for (const consent of [null, false])
        await assert.rejects(complete("Bruno Golf", 25, consent), /privacidad/);
      for (const name of [null, " ", "A", "A".repeat(81)])
        await assert.rejects(complete(name, 25, true), /nombre y apellido/);
      assert.equal((await db.query("select * from profiles")).rows.length, 0);
    },
  );
  await t.test(
    "completar el alta activa solo al usuario actual sin autoverificación ni administración",
    async () => {
      await complete("  Bruno Golf  ", 27, true);
      const profile = (
        await db.query<{ name: string; age: number; verified: boolean }>(
          "select name,age,verified from profiles where id=$1",
          [googleUser],
        )
      ).rows[0];
      assert.deepEqual(profile, {
        name: "Bruno Golf",
        age: 27,
        verified: false,
      });
      assert.equal(
        (await db.query<{ active: boolean }>("select active_user() active"))
          .rows[0].active,
        true,
      );
      assert.deepEqual(
        (
          await db.query(
            "select is_admin,suspended from account_roles where user_id=$1",
            [googleUser],
          )
        ).rows[0],
        { is_admin: false, suspended: false },
      );
      await complete("Otro nombre", 99, true);
      assert.deepEqual(
        (
          await db.query("select name,age,verified from profiles where id=$1", [
            googleUser,
          ])
        ).rows[0],
        profile,
      );
    },
  );
  await t.test(
    "correo y Google conservan su ciudad inicial sin reemplazar cambios posteriores",
    async () => {
      for (const [id, city] of [
        [emailUser, "Querétaro"],
        [googleUser, "Silao"],
      ]) {
        await as(id);
        const profile = (
          await db.query<{ city: string; availability: string[] }>(
            "select city,availability from profiles where id=$1",
            [id],
          )
        ).rows[0];
        const chosen = initialSignupCity(profile, { signup_city: city });
        assert.equal(chosen, city);
        const save = () =>
          db.query(
            "update profiles set city=$1 where id=$2 and city='León' and availability='{}'::text[] returning city",
            [chosen, id],
          );
        assert.equal((await save()).rows.length, 1);
        assert.equal((await save()).rows.length, 0);
        await db.query(
          "update profiles set city='León', availability='{Sábado}' where id=$1",
          [id],
        );
        assert.equal((await save()).rows.length, 0);
        assert.equal(
          (
            await db.query<{ city: string }>(
              "select city from profiles where id=$1",
              [id],
            )
          ).rows[0].city,
          "León",
        );
      }
    },
  );
  await t.test(
    "cuentas suspendidas, anónimas y eliminadas no pueden activar un perfil",
    async () => {
      await db.exec("reset role");
      await db.query(
        "update account_roles set suspended=true where user_id=$1",
        [googleUser],
      );
      await as(googleUser);
      await assert.rejects(
        complete("Bruno Golf", 27, true),
        /Cuenta no disponible/,
      );
      await as("", "anon");
      await assert.rejects(
        complete("Bruno Golf", 27, true),
        /permission denied/,
      );
      await as(randomUUID());
      await assert.rejects(complete("Bruno Golf", 27, true), /Inicia sesión/);
    },
  );
  await t.test(
    "el registro por correo conserva la edad obligatoria y no permite falsificar el proveedor",
    async () => {
      await as(emailUser);
      await assert.rejects(
        complete("Ana Golf", 25, true),
        /Inicia sesión con Google/,
      );
      await db.exec("reset role");
      for (const metadata of [
        '{"name":"Menor","age":17}',
        '{"name":"Menor","provider":"google"}',
      ]) {
        await assert.rejects(
          db.query(
            'insert into auth.users(id,raw_user_meta_data,raw_app_meta_data) values($1,$2,\'{"provider":"email"}\')',
            [randomUUID(), metadata],
          ),
          /check constraint|not-null constraint/,
        );
      }
      assert.equal(
        (await db.query("select * from profiles where id=$1", [emailUser])).rows
          .length,
        1,
      );
    },
  );
});
