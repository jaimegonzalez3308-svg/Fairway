import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

test("directorio público y borrado protegido por contraseña y correo en PostgreSQL", async (t) => {
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
  ]) {
    const sql = (
      await readFile(
        new URL("../supabase/migrations/" + file, import.meta.url),
        "utf8",
      )
    ).replace("create extension if not exists pgcrypto;", "");
    await db.exec(sql);
  }
  async function owner() {
    await db.exec("reset role");
  }
  async function account() {
    await owner();
    const id = randomUUID(),
      email = id + "@example.invalid";
    await db.query(
      `insert into auth.users(id,raw_user_meta_data,email,email_confirmed_at) values($1,'{"name":"Golfista prueba","age":25}',$2,clock_timestamp())`,
      [id, email],
    );
    return { id, email };
  }
  async function session(user: { id: string }, age = 0) {
    await owner();
    const id = randomUUID();
    await db.query(
      `insert into auth.sessions values($1,$2,clock_timestamp()-$3::integer*interval '1 second')`,
      [id, user.id, age],
    );
    return id;
  }
  async function login(
    user: { id: string; email: string },
    sid: string,
    method = "password",
    age = 0,
    extras: Record<string, unknown> = {},
  ) {
    await owner();
    const now = (
      await db.query<{ epoch: number }>(
        `select floor(extract(epoch from clock_timestamp()))::double precision epoch`,
      )
    ).rows[0].epoch;
    await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
      user.id,
    ]);
    await db.query(`select set_config('request.jwt.claims',$1,false)`, [
      JSON.stringify({
        sub: user.id,
        email: user.email,
        phone: "",
        session_id: sid,
        amr: [{ method, timestamp: now - age }],
        ...extras,
      }),
    ]);
    await db.exec("set role authenticated");
  }
  async function request() {
    const user = await account();
    const sid = await session(user);
    await login(user, sid);
    await db.exec("select begin_account_deletion()");
    return { user, sid };
  }
  await t.test(
    "sin cuenta solo se consulta el catálogo público y no perfiles ni solicitudes de borrado",
    async () => {
      await db.exec("set role anon");
      assert.equal(
        (
          await db.query(
            "select id,name,city,description,verified,access_info from clubs",
          )
        ).rows.length,
        6,
      );
      await assert.rejects(
        db.exec("select * from profiles"),
        /permission denied/,
      );
      await assert.rejects(
        db.exec("select * from account_deletion_requests"),
        /permission denied/,
      );
      await assert.rejects(
        db.exec("select delete_my_account()"),
        /permission denied/,
      );
    },
  );
  await t.test(
    "la solicitud requiere una sesión nueva de contraseña y rechaza tokens antiguos o de correo",
    async () => {
      const u = await account();
      const sid = await session(u, 300);
      await login(u, sid, "password", 300);
      await assert.rejects(
        db.exec("select begin_account_deletion()"),
        /contraseña/,
      );
      const fresh = await session(u);
      await login(u, fresh, "otp");
      await assert.rejects(
        db.exec("select begin_account_deletion()"),
        /contraseña/,
      );
      await login(u, fresh);
      await db.exec("select begin_account_deletion()");
      await assert.rejects(
        db.exec("select begin_account_deletion()"),
        /Espera un minuto/,
      );
      await assert.rejects(
        db.exec(
          "insert into account_deletion_requests(user_id,email,password_session_id) values(gen_random_uuid(),'x',gen_random_uuid())",
        ),
        /permission denied/,
      );
    },
  );
  await t.test(
    "la contraseña por sí sola y una confirmación anterior no permiten borrar",
    async () => {
      const u = await account();
      const previous = await session(u, 120);
      const pwd = await session(u);
      await login(u, pwd);
      await db.exec("select begin_account_deletion()");
      await assert.rejects(
        db.exec("select delete_my_account()"),
        /contraseña y una nueva confirmación/,
      );
      await login(u, previous, "otp");
      assert.equal(
        (
          await db.query<{ email_confirmed: boolean }>(
            "select * from account_deletion_status()",
          )
        ).rows[0].email_confirmed,
        false,
      );
      await assert.rejects(
        db.exec("select delete_my_account()"),
        /contraseña y una nueva confirmación/,
      );
      await login(u, pwd, "otp");
      await assert.rejects(
        db.exec("select delete_my_account()"),
        /contraseña y una nueva confirmación/,
      );
    },
  );
  await t.test(
    "otro usuario no puede consultar ni completar la solicitud",
    async () => {
      await request();
      const other = await account();
      const sid = await session(other);
      await login(other, sid, "otp");
      assert.equal(
        (await db.query("select * from account_deletion_status()")).rows.length,
        0,
      );
      await assert.rejects(
        db.exec("select delete_my_account()"),
        /contraseña y una nueva confirmación/,
      );
    },
  );
  await t.test(
    "un enlace posterior confirma correo; las solicitudes vencidas o canceladas no permiten borrar",
    async () => {
      const { user } = await request();
      const mail = await session(user);
      await login(user, mail, "otp");
      assert.equal(
        (
          await db.query<{ email_confirmed: boolean }>(
            "select * from account_deletion_status()",
          )
        ).rows[0].email_confirmed,
        true,
      );
      await owner();
      await db.query(
        `update account_deletion_requests set expires_at=clock_timestamp()-interval '1 second' where user_id=$1`,
        [user.id],
      );
      await login(user, mail, "otp");
      await assert.rejects(
        db.exec("select delete_my_account()"),
        /contraseña y una nueva confirmación/,
      );
      const second = await request();
      const mail2 = await session(second.user);
      await login(second.user, mail2, "otp");
      await db.exec("select cancel_account_deletion()");
      await assert.rejects(
        db.exec("select delete_my_account()"),
        /contraseña y una nueva confirmación/,
      );
    },
  );
  await t.test(
    "los cambios de correo y los tokens de teléfono no se aceptan como confirmación del correo solicitado",
    async () => {
      const { user } = await request();
      const mail = await session(user);
      await owner();
      await db.query(
        `update auth.users set email='otro@example.invalid' where id=$1`,
        [user.id],
      );
      await login({ ...user, email: "otro@example.invalid" }, mail, "otp");
      assert.equal(
        (
          await db.query<{ email_confirmed: boolean }>(
            "select * from account_deletion_status()",
          )
        ).rows[0].email_confirmed,
        false,
      );
      await owner();
      await db.query(
        `update auth.users set email=$2,phone='555000' where id=$1`,
        [user.id, user.email],
      );
      await login(user, mail, "otp", 0, { phone: "555000" });
      assert.equal(
        (
          await db.query<{ email_confirmed: boolean }>(
            "select * from account_deletion_status()",
          )
        ).rows[0].email_confirmed,
        false,
      );
      await assert.rejects(
        db.exec("select delete_my_account()"),
        /contraseña y una nueva confirmación/,
      );
    },
  );
  await t.test(
    "solo contraseña seguida de un nuevo correo elimina datos y revoca acceso de tokens anteriores",
    async () => {
      const { user } = await request();
      await owner();
      await db.query(
        `insert into posts(user_id,body) values($1,'Publicación de prueba')`,
        [user.id],
      );
      const mail = await session(user);
      await login(user, mail, "otp");
      await db.exec("select delete_my_account()");
      assert.equal(
        (await db.query<{ active_user: boolean }>("select active_user()"))
          .rows[0].active_user,
        false,
      );
      await owner();
      assert.equal(
        (await db.query("select * from auth.users where id=$1", [user.id])).rows
          .length,
        0,
      );
      assert.equal(
        (await db.query("select * from profiles where id=$1", [user.id])).rows
          .length,
        0,
      );
      assert.equal(
        (await db.query("select * from posts where user_id=$1", [user.id])).rows
          .length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "select * from account_deletion_requests where user_id=$1",
            [user.id],
          )
        ).rows.length,
        0,
      );
    },
  );
  await db.close();
});
