import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("migraciones y reglas del MVP se ejecutan en PostgreSQL real (PGlite)", async (t) => {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create schema storage;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;grant usage on schema public,auth,storage to authenticated,anon;create publication supabase_realtime;`,
  );
  for (const file of [
    "202610150001_fairway.sql",
    "202610150002_integrity.sql",
    "202610150003_invitations.sql",
    "202610150004_clubs.sql",
  ]) {
    const sql = (
      await readFile(
        new URL("../supabase/migrations/" + file, import.meta.url),
        "utf8",
      )
    ).replace("create extension if not exists pgcrypto;", "");
    await db.exec(sql);
  }
  const a = "00000000-0000-4000-8000-000000000001",
    b = "00000000-0000-4000-8000-000000000002",
    c = "00000000-0000-4000-8000-000000000003";
  await db.exec(
    `insert into auth.users values('${a}','{"name":"Ana Golf","age":25}'),('${b}','{"name":"Bruno Golf","age":28}'),('${c}','{"name":"Carla Golf","age":30}');`,
  );
  const as = async (id: string) => {
    await db.exec(
      `reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
    );
  };
  const scalar = async (sql: string) =>
    (await db.query<Record<string, unknown>>(sql)).rows[0];
  const club = (await scalar("select id from clubs limit 1"))!.id as string;
  await t.test(
    "el catálogo adicional es idempotente y conserva los clubes existentes",
    async () => {
      const migration = await readFile(
        new URL(
          "../supabase/migrations/202610150004_clubs.sql",
          import.meta.url,
        ),
        "utf8",
      );
      const before = (
        await db.query(
          "select id,name,description,verified from clubs order by name",
        )
      ).rows;
      await db.exec(migration);
      const after = (
        await db.query(
          "select id,name,description,verified from clubs order by name",
        )
      ).rows;
      assert.deepEqual(after, before);
      for (const name of [
        "Club de Golf Los Naranjos",
        "El Molino Golf Club",
        "Villaseca Hotel & Golf",
      ]) {
        const result = await db.query<{ verified: boolean }>(
          "select verified from clubs where name=$1",
          [name],
        );
        assert.equal(result.rows.length, 1);
        assert.equal(result.rows[0].verified, false);
      }
      assert.equal(before.length, 6);
    },
  );
  let chat = "",
    gid = "";
  await t.test("un menor no puede crear perfil mediante signup", async () => {
    await db.exec("reset role");
    await assert.rejects(
      db.exec(
        `insert into auth.users values(gen_random_uuid(),'{"name":"Menor","age":17}')`,
      ),
      /check constraint/,
    );
  });
  await t.test(
    "un usuario no puede autoverificarse ni obtener rol admin",
    async () => {
      await as(a);
      await assert.rejects(
        db.exec(`update profiles set verified=true where id='${a}'`),
        /Solo administración/,
      );
      assert.equal(
        await scalar(
          `update account_roles set is_admin=true where user_id='${a}' returning user_id`,
        ),
        undefined,
      );
    },
  );
  await t.test(
    "un solo like no crea match; interés mutuo abre un chat",
    async () => {
      await as(a);
      assert.equal((await scalar(`select decide('${b}','like') id`))!.id, null);
      await as(b);
      assert.ok((await scalar(`select decide('${a}','like') id`))!.id);
      chat = (await scalar("select id from conversations limit 1"))!
        .id as string;
      await db.exec(`select send_message('${chat}','¿Jugamos el sábado?')`);
      await as(a);
      assert.equal((await db.query("select * from messages")).rows.length, 1);
    },
  );
  await t.test("un tercero no lee ni escribe mensajes del match", async () => {
    await as(c);
    assert.equal((await db.query("select * from messages")).rows.length, 0);
    await assert.rejects(
      db.exec(`select send_message('${chat}','No autorizado')`),
      /no autorizada/,
    );
    await assert.rejects(
      db.exec(`insert into matches(user_a,user_b) values('${a}','${c}')`),
      /permission denied/,
    );
  });
  await t.test(
    "el organizador aprueba, se respeta el cupo y nadie se autoaprueba",
    async () => {
      await as(a);
      gid = (await scalar(
        `insert into games(host_id,club_id,starts_at,holes,capacity,format,kind,description,access_conditions) values('${a}','${club}',now()+interval '1 day',18,2,'Casual','social','Ronda de prueba','Acceso autorizado por el club') returning id`,
      ))!.id as string;
      await as(b);
      await db.exec(`select request_join('${gid}')`);
      await assert.rejects(
        db.exec(
          `update game_participants set status='confirmed' where game_id='${gid}'`,
        ),
        /permission denied/,
      );
      await as(c);
      await db.exec(`select request_join('${gid}')`);
      await as(a);
      await db.exec(`select manage_game('${gid}','${b}','confirmed')`);
      await assert.rejects(
        db.exec(`select manage_game('${gid}','${c}','confirmed')`),
        /completa/,
      );
    },
  );
  await t.test(
    "calificaciones solo tras partida finalizada, compartida y sin duplicados",
    async () => {
      const review = (target: string) =>
        `insert into reviews(game_id,reviewer_id,target_id,punctuality,respect,pace,company) values('${gid}','${a}','${target}',5,5,5,5)`;
      await as(a);
      await assert.rejects(db.exec(review(b)), /row-level security/);
      await db.exec("reset role");
      await db.exec(
        `update games set starts_at=now()-interval '1 day' where id='${gid}'`,
      );
      await as(a);
      await db.exec(`select manage_game('${gid}','${a}','finished')`);
      await db.exec(review(b));
      await assert.rejects(db.exec(review(b)), /duplicate key/);
      await assert.rejects(db.exec(review(c)), /row-level security/);
    },
  );
  await t.test(
    "scorecards se normalizan, no aceptan golpes inválidos y respetan privacidad",
    async () => {
      await as(a);
      const scores = JSON.stringify(
        Array.from({ length: 9 }, (_, i) => ({
          hole: i + 1,
          par: 4,
          strokes: 5,
        })),
      );
      const id = (await scalar(
        `insert into rounds(user_id,club_id,played_at,holes,tee,status,privacy,scores,verified) values('${a}','${club}',current_date,9,'Manual','published','private','${scores}',true) returning id,verified`,
      ))!;
      assert.equal(id.verified, false);
      assert.equal(
        (await db.query("select * from hole_scores")).rows.length,
        9,
      );
      await as(b);
      assert.equal((await db.query("select * from rounds")).rows.length, 0);
      assert.equal((await db.query("select * from posts")).rows.length, 0);
      await as(a);
      await db.exec(`update rounds set privacy='public' where id='${id.id}'`);
      await as(b);
      assert.equal((await db.query("select * from posts")).rows.length, 1);
      await as(a);
      await assert.rejects(
        db.exec(
          `update rounds set scores='[{"hole":1,"par":4,"strokes":0}]' where id='${id.id}'`,
        ),
        /Tarjeta incompleta/,
      );
    },
  );

  await t.test(
    "invitación privada habilita ver la partida sin confirmar acceso automáticamente",
    async () => {
      await as(a);
      const id = (await scalar(
        `insert into games(host_id,club_id,starts_at,holes,capacity,format,kind,description,access_conditions,privacy) values('${a}','${club}',now()+interval '2 days',9,4,'Casual','social','Privada','Acceso sujeto al club','invite') returning id`,
      ))!.id;
      await as(c);
      assert.equal(
        (await db.query(`select * from games where id='${id}'`)).rows.length,
        0,
      );
      await assert.rejects(
        db.exec(`select request_join('${id}')`),
        /no disponible/,
      );
      await as(a);
      await db.exec(`select invite_to_game('${id}','${c}')`);
      await as(c);
      assert.equal(
        (await db.query(`select * from games where id='${id}'`)).rows.length,
        1,
      );
      await db.exec(`select request_join('${id}')`);
      assert.equal(
        (await scalar(
          `select status from game_participants where game_id='${id}' and user_id='${c}'`,
        ))!.status,
        "requested",
      );
    },
  );
  await t.test(
    "los campos verificados derivan datos del catálogo y rechazan pars alterados",
    async () => {
      await db.exec("reset role");
      const course = (await scalar(
        `insert into courses(club_id,name,verified) values('${club}','Campo de prueba',true) returning id`,
      ))!.id;
      const tee = (await scalar(
        `insert into tees(course_id,name,verified) values('${course}','Tee prueba',true) returning id`,
      ))!.id;
      await db.exec(
        `insert into holes(tee_id,hole,par,distance,index) select '${tee}',n,4,350,n from generate_series(1,9) n`,
      );
      await as(a);
      const scores = JSON.stringify(
        Array.from({ length: 9 }, (_, i) => ({
          hole: i + 1,
          par: 4,
          strokes: 5,
          distance: 350,
          index: i + 1,
        })),
      );
      const row = (await scalar(
        `insert into rounds(user_id,club_id,played_at,holes,tee,tee_id,status,scores) values('${a}','${club}',current_date,9,'Tee prueba','${tee}','finished','${scores}') returning id,verified`,
      ))!;
      assert.equal(row.verified, true);
      const bad = JSON.parse(scores);
      bad[0].par = 3;
      await assert.rejects(
        db.exec(
          `update rounds set scores='${JSON.stringify(bad)}' where id='${row.id}'`,
        ),
        /no coinciden/,
      );
    },
  );
  await t.test(
    "las preferencias suprimen notificaciones y los filtros se guardan por usuario",
    async () => {
      await as(a);
      await db.exec(
        `insert into saved_filters values('${a}','{"club":"mine"}') on conflict(user_id) do update set user_id=excluded.user_id,filters=excluded.filters`,
      );
      await db.exec(
        `insert into notification_preferences values('${a}','messages',false)`,
      );
      await db.exec("reset role");
      await db.exec(
        `insert into notifications(user_id,category,title) values('${a}','messages','Suprimida')`,
      );
      await as(a);
      assert.equal(
        (await db.query(`select * from notifications where title='Suprimida'`))
          .rows.length,
        0,
      );
      await as(b);
      assert.equal(
        (await db.query("select * from saved_filters")).rows.length,
        0,
      );
    },
  );
  await t.test(
    "bloquear impide leer y escribir en un chat previo",
    async () => {
      await as(a);
      await db.exec(`insert into blocks values('${a}','${b}')`);
      await as(b);
      assert.equal(
        (
          await db.query(
            `select * from messages where conversation_id='${chat}'`,
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        db.exec(`select send_message('${chat}','Bloqueado')`),
        /no autorizada/,
      );
      assert.equal(
        (await db.query(`select * from profiles where id='${a}'`)).rows.length,
        0,
      );
    },
  );
  await t.test("anon no puede leer información privada", async () => {
    await db.exec("reset role;set role anon");
    await assert.rejects(
      db.exec("select * from profiles"),
      /permission denied/,
    );
  });
  await db.close();
});
