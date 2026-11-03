import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Storage: reproduce la lectura rota y corrige solo el acceso autorizado a fotos", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;
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
    .filter(
      (file) =>
        file.endsWith(".sql") && !file.endsWith("_profile_image_reads.sql"),
    )
    .sort())
    await db.exec(
      (await readFile(new URL(file, dir), "utf8")).replace(
        "create extension if not exists pgcrypto;",
        "",
      ),
    );
  await db.exec(
    "grant select,insert,delete on storage.objects to authenticated;grant select on storage.objects to anon;",
  );
  const a = "00000000-0000-4000-8000-000000000001",
    b = "00000000-0000-4000-8000-000000000002";
  for (const [id, name] of [
    [a, "Ana Golf"],
    [b, "Bruno Golf"],
  ])
    await db.query(
      'insert into auth.users(id,raw_user_meta_data,raw_app_meta_data) values($1,$2::jsonb,\'{"provider":"email"}\')',
      [id, JSON.stringify({ name, age: 25 })],
    );
  const path = `${a}/photo.jpg`;
  async function as(id: string, role = "authenticated") {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec(`set role ${role}`);
  }
  async function visible() {
    return (
      await db.query<{ name: string }>(
        "select name from storage.objects order by name",
      )
    ).rows.map((row) => row.name);
  }
  await as(a);
  await db.query(
    "insert into storage.objects(bucket_id,name) values('profile-images',$1)",
    [path],
  );
  assert.deepEqual(
    await visible(),
    [],
    "La política anterior permite subir pero impide al propietario leer su foto",
  );
  await db.exec("reset role");
  const fix = await readFile(
    new URL("202610200012_profile_image_reads.sql", dir),
    "utf8",
  );
  await db.exec(fix);
  await db.exec(fix);
  await db.exec(
    "insert into storage.buckets(id,name,public) values('unrelated-bucket','unrelated-bucket',false)",
  );
  await db.query(
    "insert into storage.objects(bucket_id,name) values('unrelated-bucket',$1),('profile-images',$2)",
    [`${a}/story.jpg`, "00000000-0000-4000-8000-000000000099/orphan.jpg"],
  );
  await as(a);
  assert.deepEqual(
    await visible(),
    [path],
    "El propietario puede leer la foto existente sin volver a subirla",
  );
  await as(b);
  assert.deepEqual(
    await visible(),
    [path],
    "Otro miembro ve las fotos de perfiles visibles",
  );
  await assert.rejects(
    db.query(
      "insert into storage.objects(bucket_id,name) values('profile-images',$1)",
      [`${a}/foreign.jpg`],
    ),
    /row-level security/,
  );
  await db.exec("reset role");
  await db.query("update profiles set visibility='private' where id=$1", [a]);
  // A display name that looks like an ID cannot grant access to another user's private image.
  await db.query("update profiles set name=$1 where id=$1::uuid", [b]);
  await as(b);
  assert.deepEqual(await visible(), []);
  await as(a);
  assert.deepEqual(
    await visible(),
    [path],
    "Un propietario privado conserva acceso a su propia foto",
  );
  await db.exec("reset role");
  await db.query("update profiles set visibility='members' where id=$1", [a]);
  await db.query("insert into blocks(user_id,target_id) values($1,$2)", [a, b]);
  await as(b);
  assert.deepEqual(await visible(), []);
  await db.exec("reset role");
  await db.exec("delete from blocks");
  await db.query("update account_roles set suspended=true where user_id=$1", [
    a,
  ]);
  await as(b);
  assert.deepEqual(
    await visible(),
    [],
    "No se muestran fotos de cuentas suspendidas",
  );
  await as(a);
  assert.deepEqual(
    await visible(),
    [],
    "Una cuenta suspendida no puede leer Storage",
  );
  await as("", "anon");
  assert.deepEqual(await visible(), [], "El bucket no adquiere acceso anónimo");
  await db.exec("reset role");
  const bucket = (
    await db.query<{ public: boolean }>(
      "select public from storage.buckets where id='profile-images'",
    )
  ).rows[0];
  assert.equal(bucket.public, false);
});
