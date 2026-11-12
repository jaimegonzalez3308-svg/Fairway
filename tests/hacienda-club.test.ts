import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migrationUrl = new URL(
  "../supabase/migrations/202611120015_hacienda_club.sql",
  import.meta.url,
);
const description =
  "Club de golf en León, Guanajuato. Acceso, tarifas y condiciones de membresía pendientes de confirmar.";

async function setup() {
  const db = new PGlite();
  await db.exec(
    "create table public.clubs(id uuid primary key default gen_random_uuid(),name text not null,city text not null default 'León',verified boolean not null default false,description text,access_info text,photo text);",
  );
  return db;
}

test("La Hacienda conserva su id y toma el formato del catálogo", async () => {
  const db = await setup();
  const id = "00000000-0000-4000-8000-0000000000aa";
  await db.exec(
    `insert into clubs(id,name,city,description) values('${id}','Club de Golf La Hacienda','Por confirmar','Nombre y ubicación pendientes de validación.'),(gen_random_uuid(),'Club Campestre de León','León','Registro inicial. Datos y acceso pendientes de confirmar.');`,
  );
  const sql = await readFile(migrationUrl, "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const rows = (
    await db.query<{ id: string; name: string; city: string; description: string; verified: boolean }>(
      "select id,name,city,description,verified from clubs where name ilike '%hacienda%'",
    )
  ).rows;
  assert.deepEqual(rows, [
    { id, name: "La Hacienda Club de Golf", city: "León", description, verified: false },
  ]);
  const others = await db.query("select 1 from clubs where name='Club Campestre de León'");
  assert.equal(others.rows.length, 1);
});

test("crea La Hacienda una sola vez si no existe", async () => {
  const db = await setup();
  const sql = await readFile(migrationUrl, "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const rows = (
    await db.query<{ name: string; city: string }>(
      "select name,city from clubs where name ilike '%hacienda%'",
    )
  ).rows;
  assert.deepEqual(rows, [{ name: "La Hacienda Club de Golf", city: "León" }]);
});

test("completa una fila que ya usa el nombre definitivo", async () => {
  const db = await setup();
  await db.exec(
    "insert into clubs(name,city,description) values('La Hacienda Club de Golf','Por confirmar','Provisional');",
  );
  await db.exec(await readFile(migrationUrl, "utf8"));
  const rows = (
    await db.query<{ city: string; description: string }>(
      "select city,description from clubs where name ilike '%hacienda%'",
    )
  ).rows;
  assert.deepEqual(rows, [{ city: "León", description }]);
});
