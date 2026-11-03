import { after, test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { clubs as demoClubs } from "../lib/demo";
import type { FairwayData } from "../lib/use-fairway";

// Supabase configurado con un endpoint falso: ninguna petición sale de la máquina.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fairway-test.invalid";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

const realClub = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Club Real de Prueba",
  city: "León",
  verified: true,
  description: "",
  access_info: "",
};

// Este archivo corre en su propio proceso: el entorno simulado vive todo el archivo.
const dom = new JSDOM("<div id='root'></div>", { url: "http://127.0.0.1/" });
let clubsResponse: () => Response = () => new Response("[]");
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  location: dom.window.location,
  HTMLElement: dom.window.HTMLElement,
  localStorage: dom.window.localStorage,
  IS_REACT_ACT_ENVIRONMENT: true,
  fetch: async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes("/rest/v1/clubs")) return clubsResponse();
    return new Response("{}", {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  },
});

after(async () => {
  const { supabase } = await import("../lib/supabase");
  await supabase?.auth.stopAutoRefresh();
  // GoTrue abre un BroadcastChannel para sincronizar pestañas; mantiene vivo el proceso.
  (
    supabase?.auth as unknown as { broadcastChannel?: BroadcastChannel }
  )?.broadcastChannel?.close();
  supabase?.removeAllChannels();
  dom.window.close();
});

async function loadDirectory(
  response: () => Response,
  settled: (data: FairwayData) => boolean,
) {
  clubsResponse = response;
  const { useFairway } = await import("../lib/use-fairway");
  let latest: FairwayData | undefined;
  function Probe() {
    latest = useFairway();
    return null;
  }
  const container = dom.window.document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(Probe)));
    // Espera a que el hook procese la respuesta, no a un tiempo fijo.
    for (let i = 0; i < 200 && !(latest && settled(latest)); i++)
      await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
    assert.ok(latest && settled(latest), "el hook no procesó la respuesta");
    return latest;
  } finally {
    await act(async () => root.unmount());
  }
}

test("con Supabase configurado, un error no muestra clubes demo", async () => {
  const data = await loadDirectory(
    () =>
      new Response(JSON.stringify({ message: "fallo" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    (d) => d.toast.startsWith("No pudimos cargar los clubes"),
  );
  assert.equal(data.demo, false);
  assert.ok(demoClubs.length > 0, "el demo tiene clubes que podrían filtrarse");
  assert.equal(data.clubs.length, 0);
  assert.equal(data.publicDirectoryLive, false);
});

test("con Supabase configurado, se muestran los clubes reales", async () => {
  const data = await loadDirectory(
    () =>
      new Response(JSON.stringify([realClub]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    (d) => d.clubs.length > 0,
  );
  assert.deepEqual(
    data.clubs.map((c) => c.id),
    [realClub.id],
  );
  assert.equal(data.publicDirectoryLive, true);
});
