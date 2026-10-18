import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { claimAutomaticLocation } from "../lib/automatic-location";
import { clubsForCity } from "../lib/cities";
import { demoMe } from "../lib/demo";
import { ProfileForm } from "../components/forms";
import { CityField } from "../components/city-field";
import type { FairwayData } from "../lib/use-fairway";
import type { Club } from "../lib/domain";

test("la solicitud automática se limita a una por cuenta y navegador, sin guardar ubicación", () => {
  const saved = new Map<string, string>();
  const storage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value);
    },
  };
  assert.equal(claimAutomaticLocation("first-account", storage), true);
  assert.equal(claimAutomaticLocation("first-account", storage), false);
  assert.deepEqual(
    [...saved],
    [["fairway:profile-location:v1:first-account", "attempted"]],
  );
  saved.set("fairway:profile-location:v1:previous-visit", "attempted");
  assert.equal(claimAutomaticLocation("previous-visit", storage), false);
  assert.equal(claimAutomaticLocation("different-account", storage), true);
});

test("almacenamiento bloqueado no impide continuar ni repite la petición en la misma página", () => {
  const storage = {
    getItem() {
      throw new Error("Storage blocked");
    },
    setItem() {
      throw new Error("Storage blocked");
    },
  };
  assert.equal(claimAutomaticLocation("private-browser", storage), true);
  assert.equal(claimAutomaticLocation("private-browser", storage), false);
});

const clubs = [
  { id: "leon", name: "Club local León", city: "León" },
  { id: "silao", name: "Club local Silao", city: "Silao" },
  { id: "merida", name: "Club de una nueva ciudad", city: "Mérida" },
  {
    id: "unknown",
    name: "Club sin ubicación confirmada",
    city: "Por confirmar",
  },
] as Club[];

test("el catálogo sigue la ciudad y conserva membresías elegidas de otras ciudades", () => {
  const ids = (city: string, chosen: string[] = [], all = false) =>
    clubsForCity(clubs, city, chosen, all).map((club) => club.id);
  assert.deepEqual(ids("SILAO"), ["silao"]);
  assert.deepEqual(ids("Mérida"), ["merida"]);
  assert.deepEqual(ids("León"), ["leon"]);
  assert.deepEqual(ids("Silao", ["leon"]), ["leon", "silao"]);
  assert.deepEqual(ids("Silao", ["unknown"]), ["silao", "unknown"]);
  assert.deepEqual(ids("Silao", [], true), [
    "leon",
    "silao",
    "merida",
    "unknown",
  ]);
  assert.deepEqual(ids("Ciudad de México"), []);
});

function renderProfile({
  completed = false,
  demo = false,
  city = "Silao",
  primary = null as string | null,
} = {}) {
  const data = {
    me: {
      ...demoMe,
      club_id: primary,
      additional_clubs: [],
      city,
      availability: completed ? ["Sábado"] : [],
    },
    clubs,
    user: { id: "profile-fixture" },
    demo,
  } as unknown as FairwayData;
  return renderToStaticMarkup(
    createElement(ProfileForm, { data, onDone() {} }),
  );
}

test("solo los perfiles nuevos anuncian la solicitud automática y muestran clubes de su ciudad", () => {
  const html = renderProfile();
  assert.match(html, /solicitaremos permiso para rellenar tu ciudad/);
  assert.match(html, /Club local Silao/);
  assert.doesNotMatch(html, /Club local León/);
  assert.match(html, /Ver también clubes de otras ciudades/);
  assert.match(html, /No pertenezco a ningún club/);
  assert.doesNotMatch(
    renderProfile({ completed: true }),
    /solicitaremos permiso para rellenar tu ciudad/,
  );
  assert.doesNotMatch(
    renderProfile({ demo: true }),
    /solicitaremos permiso para rellenar tu ciudad/,
  );
});

test("una ciudad sin clubes permite continuar y la selección anterior se mantiene visible", () => {
  assert.match(
    renderProfile({ city: "Ciudad de México" }),
    /Puedes continuar sin club/,
  );
  const existing = renderProfile({ city: "Silao", primary: "leon" });
  assert.match(existing, /<option[^>]*value="leon"/);
  assert.match(existing, /Club local León/);
});

test("las ciudades nuevas del catálogo se incluyen en la elección manual", () => {
  const html = renderToStaticMarkup(
    createElement(CityField, { value: "", onChange() {}, cities: ["Mérida"] }),
  );
  assert.match(html, /value="Mérida"/);
  assert.match(html, /Escribe o elige tu ciudad/);
  assert.match(html, /required/);
});
