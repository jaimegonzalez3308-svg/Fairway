import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { FirstRoundSetup } from "../components/first-round-setup";
import { DiscoveryEmpty } from "../components/discovery-empty";
import { demoMe } from "../lib/demo";
import {
  firstRoundPreferences,
  type FirstRoundPreferences,
} from "../lib/first-round";
import { gameShareUrl, sharedGameId, sectionUrl } from "../lib/game-share";
import { authRedirectUrl } from "../lib/auth";

const id = "44444444-4444-4444-8444-444444444444";

test("round links contain only a validated ID and survive authentication", () => {
  const link = gameShareUrl(
    "https://example.com/?code=private&recovery=1#access_token=private",
    id,
  );
  assert.equal(link, `https://example.com/?partida=${id}#partidas`);
  assert.equal(sharedGameId(new URL(link).search), id);
  assert.equal(
    authRedirectUrl(
      "https://example.com",
      false,
      `?partida=${id}&code=private`,
    ),
    link,
  );
  assert.equal(
    authRedirectUrl("https://example.com", true, `?partida=${id}`),
    "https://example.com/?recovery=1",
  );
  for (const value of ["", "javascript:alert(1)", "not-a-uuid"])
    assert.equal(sharedGameId(`?partida=${value}`), null);
  assert.throws(() => gameShareUrl("https://example.com", "fake-game"));
});

test("section navigation removes shared details and consumed authentication parameters", () => {
  assert.equal(
    sectionUrl(
      `https://example.com/?partida=${id}&golfista=${id}&code=secret&recovery=1#error=bad`,
      "mensajes",
    ),
    "/#mensajes",
  );
  assert.equal(
    sectionUrl("https://example.com/?utm_source=club#perfil", "partidas"),
    "/?utm_source=club#partidas",
  );
});

test("first-round preferences validate and only include the five intended profile fields", () => {
  const input = {
    ...demoMe,
    availability: ["Sábado", "Sábado", "unknown"],
    city: "  leon  ",
  };
  assert.deepEqual(firstRoundPreferences(input), {
    availability: ["Sábado"],
    holes: demoMe.holes,
    style: demoMe.style,
    city: "León",
    club_id: demoMe.club_id,
  });
  for (const changes of [
    { availability: [] },
    { city: " " },
    { holes: 10 },
    { style: "invented" },
  ])
    assert.throws(() => firstRoundPreferences({ ...input, ...changes }));
});

function mount() {
  const dom = new JSDOM("<div id='root'></div>", {
    url: "http://127.0.0.1:3100/",
  });
  const original = new Map<string, PropertyDescriptor | undefined>();
  const values: Record<string, unknown> = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    Element: dom.window.Element,
    DocumentFragment: dom.window.DocumentFragment,
    Node: dom.window.Node,
    NodeFilter: dom.window.NodeFilter,
    CustomEvent: dom.window.CustomEvent,
    MutationObserver: dom.window.MutationObserver,
    HTMLButtonElement: dom.window.HTMLButtonElement,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    Event: dom.window.Event,
    location: dom.window.location,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [name, value] of Object.entries(values)) {
    original.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      value,
      configurable: true,
      writable: true,
    });
  }
  dom.window.matchMedia = (() => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return true;
    },
    media: "",
    onchange: null,
  })) as typeof window.matchMedia;
  dom.window.scrollTo = () => {};
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  return {
    root,
    container,
    dom,
    async cleanup() {
      await act(async () => root.unmount());
      dom.window.close();
      for (const [key, descriptor] of original) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}
function button(container: HTMLElement, text: string) {
  const element = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(text),
  );
  assert.ok(element, `Missing button: ${text}`);
  return element;
}
async function click(element: HTMLElement) {
  await act(async () => element.click());
}

test("setup blocks empty days, retains choices after a failed save, and retries without duplicate saves", async () => {
  const view = mount();
  let attempts = 0;
  let saved: FirstRoundPreferences | undefined;
  let completed = "";
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await act(async () =>
      view.root.render(
        createElement(FirstRoundSetup, {
          profile: { ...demoMe, availability: [] },
          clubs: [],
          onSkip() {},
          async onSave(value) {
            attempts++;
            saved = value;
            if (attempts === 1)
              throw new Error("Sin conexión. Intenta de nuevo.");
            await pending;
          },
          onDone(destination) {
            completed = destination;
          },
        }),
      ),
    );
    await click(button(view.container, "Continuar"));
    assert.match(
      view.container.querySelector('[role="alert"]')!.textContent!,
      /al menos un día/,
    );
    assert.equal(attempts, 0);
    const saturday = Array.from(view.container.querySelectorAll("label"))
      .find((l) => l.textContent?.includes("Sábado"))!
      .querySelector("input")!;
    await click(saturday);
    await click(button(view.container, "Continuar"));
    assert.match(view.container.textContent!, /Dónde sueles jugar/);
    await click(button(view.container, "Continuar"));
    assert.match(view.container.textContent!, /Sábado/);
    await click(button(view.container, "Guardar y buscar"));
    assert.equal(attempts, 1);
    assert.equal(completed, "");
    assert.match(
      view.container.querySelector('[role="alert"]')!.textContent!,
      /Sin conexión/,
    );
    const save = button(view.container, "Guardar y buscar");
    await act(async () => {
      save.click();
      save.click();
    });
    assert.equal(attempts, 2);
    assert.equal(button(view.container, "Ahora no").disabled, true);
    await act(async () => release());
    assert.equal(completed, "descubrir");
    assert.deepEqual(saved!.availability, ["Sábado"]);
  } finally {
    await view.cleanup();
  }
});

test("setup can be skipped without saving and offers round creation after saving", async () => {
  const view = mount();
  let skips = 0,
    saves = 0,
    destination = "";
  try {
    await act(async () =>
      view.root.render(
        createElement(FirstRoundSetup, {
          profile: { ...demoMe, availability: ["Domingo"] },
          clubs: [],
          onSkip() {
            skips++;
          },
          async onSave() {
            saves++;
          },
          onDone(value) {
            destination = value;
          },
        }),
      ),
    );
    await click(button(view.container, "Ahora no"));
    assert.equal(skips, 1);
    assert.equal(saves, 0);
    await click(button(view.container, "Continuar"));
    await click(button(view.container, "Continuar"));
    await click(button(view.container, "Guardar y crear"));
    assert.equal(saves, 1);
    assert.equal(destination, "crear");
  } finally {
    await view.cleanup();
  }
});

test("empty discovery distinguishes a new community, exhausted profiles and restrictive filters", () => {
  const render = (hasProfiles: boolean, exhausted: boolean) =>
    renderToStaticMarkup(
      createElement(DiscoveryEmpty, {
        hasProfiles,
        exhausted,
        onReset() {},
        onCreate() {},
        onShareProfile() {},
      }),
    );
  assert.match(render(false, false), /Tu comunidad empieza/);
  assert.doesNotMatch(render(false, false), /Ampliar búsqueda/);
  assert.match(render(true, false), /Ampliar búsqueda/);
  assert.match(render(true, true), /Ya conociste/);
  assert.doesNotMatch(render(true, true), /Ampliar búsqueda/);
  for (const html of [
    render(false, false),
    render(true, false),
    render(true, true),
  ]) {
    assert.match(html, /Crear una partida/);
    assert.match(html, /Invitar a un amigo/);
    assert.match(html, /Compartir mi perfil/);
  }
});

test("section navigation creates history entries and Back/Forward restores the visible screen", async () => {
  const view = mount();
  try {
    view.dom.window.history.replaceState(null, "", "/#clubes");
    const { default: FairwayApp } = await import("../components/fairway-app");
    await act(async () => view.root.render(createElement(FairwayApp)));
    assert.equal(view.container.querySelector("main")?.dataset.page, "clubes");
    const initialLength = view.dom.window.history.length;
    await click(button(view.container, "Mi perfil"));
    assert.equal(view.dom.window.location.hash, "#perfil");
    assert.equal(view.container.querySelector("main")?.dataset.page, "perfil");
    await click(button(view.container, "Partidas"));
    assert.equal(view.dom.window.history.length, initialLength + 2);
    assert.equal(view.dom.window.document.title, "Partidas · Fairway");
    await act(async () => {
      const changed = new Promise<void>((resolve) =>
        view.dom.window.addEventListener("popstate", () => resolve(), {
          once: true,
        }),
      );
      view.dom.window.history.back();
      await changed;
    });
    assert.equal(view.container.querySelector("main")?.dataset.page, "perfil");
    assert.equal(view.dom.window.document.title, "Mi perfil · Fairway");
    await act(async () => {
      const changed = new Promise<void>((resolve) =>
        view.dom.window.addEventListener("popstate", () => resolve(), {
          once: true,
        }),
      );
      view.dom.window.history.forward();
      await changed;
    });
    assert.equal(
      view.container.querySelector("main")?.dataset.page,
      "partidas",
    );
    const length = view.dom.window.history.length;
    await click(button(view.container, "Partidas"));
    assert.equal(view.dom.window.history.length, length);
  } finally {
    await view.cleanup();
  }
});

test("installed iOS opens the app shell and its score tab preserves navigation history", async () => {
  const view = mount();
  Object.assign(view.dom.window, { Capacitor: { getPlatform: () => "ios" } });
  try {
    const { default: FairwayApp } = await import("../components/fairway-app");
    await act(async () => view.root.render(createElement(FairwayApp)));
    assert.ok(view.container.querySelector(".native-app"));
    assert.equal(
      view.container.querySelector("main")?.dataset.page,
      "descubrir",
    );
    // next/dynamic may still be resolving the locally bundled native component.
    await act(async () => {
      await import("../components/native-experience");
    });
    const nav = view.container.querySelector(".native-tab-bar");
    assert.ok(nav);
    const scores = Array.from(nav.querySelectorAll("button")).find(
      (b) => b.textContent === "Scores",
    );
    assert.ok(scores);
    await click(scores);
    assert.equal(view.dom.window.location.hash, "#scores");
    assert.equal(view.container.querySelector("main")?.dataset.page, "scores");
    assert.equal(
      view.container.querySelectorAll('.native-tab-bar [aria-current="page"]')
        .length,
      1,
    );
    assert.equal(view.container.querySelector(".mobile-nav"), null);
    const more = view.container.querySelector(
      'button[aria-label="Más opciones"]',
    );
    assert.ok(more);
    await click(more as HTMLElement);
    assert.equal(
      view.container
        .querySelector("#fairway-sidebar")
        ?.getAttribute("aria-hidden"),
      "false",
    );
    assert.match(
      view.container.querySelector("#fairway-sidebar")?.textContent || "",
      /Comunidad/,
    );
    assert.match(
      view.container.querySelector("#fairway-sidebar")?.textContent || "",
      /Amigos/,
    );
  } finally {
    await view.cleanup();
  }
});

test("dismissing setup during a pending save does not navigate when it finishes", async () => {
  const view = mount();
  let release!: () => void;
  let completed = false;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await act(async () =>
      view.root.render(
        createElement(FirstRoundSetup, {
          profile: { ...demoMe, availability: ["Sábado"] },
          clubs: [],
          onSkip() {},
          onSave: () => pending,
          onDone() {
            completed = true;
          },
        }),
      ),
    );
    await click(button(view.container, "Continuar"));
    await click(button(view.container, "Continuar"));
    await click(button(view.container, "Guardar y buscar"));
    await act(async () => view.root.render(null));
    await act(async () => release());
    assert.equal(completed, false);
  } finally {
    await view.cleanup();
  }
});
