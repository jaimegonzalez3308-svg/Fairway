import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  cityFromGeocode,
  cityKey,
  cityOptions,
  detectCity,
  gameMatchesCity,
  locationError,
  matchesCity,
  normalizeCity,
} from "../lib/cities";
import { profileSchema, type Club, type Game } from "../lib/domain";
import { CityField } from "../components/city-field";
import { PartyMonthCalendar } from "../components/party-month-calendar";
import type { FairwayData } from "../lib/use-fairway";

test("las ciudades agrupan mayúsculas, acentos y los nombres conocidos de León sin mezclar otras ciudades", () => {
  assert.equal(normalizeCity("  león  de los Aldama "), "León");
  assert.equal(normalizeCity("Leon, Gto."), "León");
  assert.equal(normalizeCity("CDMX"), "Ciudad de México");
  assert.equal(
    normalizeCity("  San  Francisco del Rincón  "),
    "San Francisco del Rincón",
  );
  assert.equal(matchesCity("QUERETARO", "mine", "Querétaro"), true);
  assert.equal(matchesCity("Silao", "mine", "León"), false);
  assert.equal(matchesCity("León, ES", "mine", "León"), false);
  assert.equal(matchesCity("Alrededores de León", "mine", "León"), true);
  assert.equal(cityKey("Por confirmar"), "");
  assert.equal(matchesCity(undefined, "mine", "León"), false);
  assert.equal(matchesCity(undefined, "any", "León"), true);
  assert.deepEqual(
    cityOptions([
      "Leon",
      "León",
      "Alrededores de León",
      "Por confirmar",
      "Silao",
    ]),
    ["León", "Silao"],
  );
});

test("la ciudad del perfil se valida antes de guardar, incluida la entrada manual", () => {
  assert.equal(profileSchema.shape.city.parse("  leon "), "León");
  assert.equal(profileSchema.shape.city.safeParse("  ").success, false);
  assert.equal(
    profileSchema.shape.city.safeParse("x".repeat(81)).success,
    false,
  );
});

test("las partidas pertenecen a la ciudad de su campo, sin inventar una ciudad para campos desconocidos", () => {
  const clubs = [
    { id: "a", city: "León" },
    { id: "b", city: "Silao" },
  ] as Club[];
  assert.equal(gameMatchesCity({ club_id: "b" }, clubs, "mine", "León"), false);
  assert.equal(gameMatchesCity({ club_id: "a" }, clubs, "mine", "León"), true);
  assert.equal(
    gameMatchesCity({ club_id: "missing" }, clubs, "Silao", "León"),
    false,
  );
  assert.equal(
    gameMatchesCity({ club_id: "missing" }, clubs, "any", "León"),
    true,
  );
});

test("el proveedor sugiere una ciudad o localidad válida y distingue países", () => {
  assert.equal(
    cityFromGeocode({ city: "León de los Aldama", countryCode: "MX" }),
    "León",
  );
  assert.equal(
    cityFromGeocode({ city: "", locality: "Silao", countryCode: "MX" }),
    "Silao",
  );
  assert.equal(
    cityFromGeocode({ city: "León", countryCode: "ES" }),
    "León, ES",
  );
  for (const value of [null, {}, { city: "" }, { city: "x".repeat(81) }])
    assert.throws(() => cityFromGeocode(value));
});

const position = {
  coords: { latitude: 21.123456, longitude: -101.678912 },
} as GeolocationPosition;

test("la detección solo envía coordenadas aproximadas, sin cookies ni dirección del perfil", async () => {
  let requests = 0;
  const city = await detectCity(
    {
      getCurrentPosition(success, _error, options) {
        assert.equal(options?.enableHighAccuracy, false);
        assert.equal(options?.maximumAge, 0);
        success(position);
      },
    },
    new AbortController().signal,
    async (input, options) => {
      requests++;
      const url = new URL(String(input));
      assert.equal(url.origin, "https://api.bigdatacloud.net");
      assert.equal(url.searchParams.get("latitude"), "21.12");
      assert.equal(url.searchParams.get("longitude"), "-101.68");
      assert.equal(url.searchParams.size, 3);
      assert.equal(options?.credentials, "omit");
      assert.equal(options?.referrerPolicy, "no-referrer");
      assert.equal(options?.cache, "no-store");
      return new Response(JSON.stringify({ city: "León", countryCode: "MX" }));
    },
  );
  assert.equal(city, "León");
  assert.equal(requests, 1);
});

test("denegar el permiso nunca activa una consulta por IP y una detección cancelada no consulta el proveedor", async () => {
  let requests = 0;
  const fetcher: typeof fetch = async () => {
    requests++;
    throw new Error("Unexpected network request");
  };
  for (const code of [1, 2, 3]) {
    await assert.rejects(
      detectCity(
        {
          getCurrentPosition(_success, error) {
            error?.({ code } as GeolocationPositionError);
          },
        },
        new AbortController().signal,
        fetcher,
      ),
      (error: unknown) => (error as { code: number }).code === code,
    );
    assert.match(locationError({ code }), /ciudad/);
  }
  const controller = new AbortController();
  let located: PositionCallback | undefined;
  const pending = detectCity(
    {
      getCurrentPosition(success) {
        located = success;
      },
    },
    controller.signal,
    fetcher,
  );
  controller.abort();
  located?.(position);
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(requests, 0);
});

test("errores o respuestas vacías del geocodificador no inventan una ciudad", async () => {
  for (const response of [
    new Response("Unavailable", { status: 503 }),
    new Response("{}"),
  ]) {
    await assert.rejects(
      detectCity(
        {
          getCurrentPosition(success) {
            success(position);
          },
        },
        new AbortController().signal,
        async () => response,
      ),
    );
  }
});

test("mostrar el campo no pide ubicación; la entrada manual y el aviso del proveedor están disponibles", () => {
  const html = renderToStaticMarkup(
    createElement(CityField, { value: "León", onChange() {} }),
  );
  assert.match(html, /autocomplete="address-level2"/i);
  assert.match(html, /Usar mi ubicación/);
  assert.match(html, /BigDataCloud/);
  assert.match(html, /value="León"/);
  assert.match(html, /aria-live="polite"/);
});

test("el calendario aplica el filtro por ciudad y conserva las partidas propias de otras ciudades", () => {
  const games = [
    {
      id: "a",
      club_id: "leon",
      host_id: "other",
      starts_at: "2026-10-20T14:00:00-06:00",
      status: "open",
      participants: [],
      capacity: 4,
    },
    {
      id: "b",
      club_id: "silao",
      host_id: "me",
      starts_at: "2026-10-20T15:00:00-06:00",
      status: "open",
      participants: [],
      capacity: 4,
    },
  ] as unknown as Game[];
  const data = {
    games,
    clubs: [
      { id: "leon", name: "Campo local de prueba", city: "León" },
      { id: "silao", name: "Campo visitante de prueba", city: "Silao" },
    ],
    me: { id: "me", name: "Ana", city: "León" },
    profiles: [],
    user: { id: "me" },
    myReviews: [],
  } as unknown as FairwayData;
  const render = (mine: boolean, cityScope: string) =>
    renderToStaticMarkup(
      createElement(PartyMonthCalendar, {
        data,
        selectedDate: "2026-10-20",
        onDateChange() {},
        onCreate() {},
        onOpen() {},
        mine,
        club: "",
        openOnly: false,
        now: new Date("2026-10-18T12:00:00-06:00"),
        cityScope,
      }),
    );
  assert.match(render(false, "mine"), /Campo local de prueba/);
  assert.doesNotMatch(render(false, "mine"), /Campo visitante de prueba/);
  assert.match(render(false, "any"), /Campo visitante de prueba/);
  assert.match(render(true, "mine"), /Campo visitante de prueba/);
});
