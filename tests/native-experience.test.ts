import { test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { isIOSApp } from "../lib/native-app";
import { useNativeApp } from "../lib/use-native-app";
import { useFairway } from "../lib/use-fairway";
import { Parties } from "../components/parties";
import {
  NativeWelcome,
  NativeTabBar,
  NativeQuickActions,
} from "../components/native-experience";

function mount(platform?: string) {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://127.0.0.1/" });
  if (platform)
    Object.assign(dom.window, { Capacitor: { getPlatform: () => platform } });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  return {
    dom,
    root,
    container,
    async cleanup() {
      await act(async () => root.unmount());
      dom.window.close();
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

test("native styling is limited to installed iOS, and cleans up on unmount", async () => {
  assert.equal(isIOSApp(), false);
  for (const platform of [undefined, "web", "android", "ios"]) {
    const view = mount(platform);
    function Example() {
      return createElement("output", null, String(useNativeApp()));
    }
    try {
      await act(async () => view.root.render(createElement(Example)));
      assert.equal(view.container.textContent, String(platform === "ios"));
      assert.equal(
        view.dom.window.document.documentElement.classList.contains(
          "native-ios",
        ),
        platform === "ios",
      );
      await act(async () => view.root.unmount());
      assert.equal(
        view.dom.window.document.documentElement.classList.contains(
          "native-ios",
        ),
        false,
      );
    } finally {
      await view.cleanup();
    }
  }
});

test("the compact welcome keeps login, signup, public clubs and legal notices accessible", async () => {
  const view = mount();
  const actions: string[] = [];
  try {
    await act(async () =>
      view.root.render(
        createElement(NativeWelcome, {
          onLogin: () => actions.push("login"),
          onSignup: () => actions.push("signup"),
          onClubs: () => actions.push("clubs"),
        }),
      ),
    );
    for (const label of [
      "Iniciar sesión",
      "Crear mi cuenta",
      "Explorar clubes sin cuenta",
    ]) {
      const button = Array.from(view.container.querySelectorAll("button")).find(
        (b) => b.textContent?.includes(label),
      );
      assert.ok(button, label);
      await act(async () => button.click());
    }
    assert.deepEqual(actions, ["login", "signup", "clubs"]);
    assert.ok(view.container.querySelector('a[href="/legal/privacidad/"]'));
    assert.ok(view.container.querySelector('a[href="/legal/terminos/"]'));
    assert.equal(view.container.querySelectorAll("h1").length, 1);
  } finally {
    await view.cleanup();
  }
});

test("app tabs put friends one tap away, announce unread messages and requests, and select the destination", async () => {
  const view = mount();
  const destinations: string[] = [];
  try {
    await act(async () =>
      view.root.render(
        createElement(NativeTabBar, {
          page: "amigos",
          unreadMessages: 3,
          friendRequests: 2,
          onNavigate: (page) => destinations.push(page),
        }),
      ),
    );
    const buttons = Array.from(view.container.querySelectorAll("button"));
    assert.equal(buttons.length, 5);
    assert.match(
      view.container.querySelector('[aria-current="page"]')?.textContent || "",
      /Amigos$/,
    );
    assert.ok(
      view.container.querySelector('[aria-label="3 mensajes sin leer"]'),
    );
    assert.ok(
      view.container.querySelector('[aria-label="2 solicitudes de amistad"]'),
    );
    for (const button of buttons) await act(async () => button.click());
    assert.deepEqual(destinations, [
      "descubrir",
      "partidas",
      "amigos",
      "mensajes",
      "perfil",
    ]);
    await act(async () =>
      view.root.render(
        createElement(NativeTabBar, {
          page: "amigos",
          inert: true,
          onNavigate() {},
        }),
      ),
    );
    assert.ok(view.container.querySelector("nav[inert]"));
  } finally {
    await view.cleanup();
  }
});

test("quick actions lead to creation, scores and friends without starting writes", async () => {
  const view = mount();
  const actions: string[] = [];
  try {
    await act(async () =>
      view.root.render(
        createElement(NativeQuickActions, {
          onCreate: () => actions.push("create"),
          onScore: () => actions.push("score"),
          onFriends: () => actions.push("friends"),
        }),
      ),
    );
    assert.deepEqual(actions, []);
    for (const button of view.container.querySelectorAll("button"))
      await act(async () => button.click());
    assert.deepEqual(actions, ["create", "score", "friends"]);
  } finally {
    await view.cleanup();
  }
});

test("native detection does not run during static rendering", () => {
  function Example() {
    return createElement("output", null, String(useNativeApp()));
  }
  assert.equal(
    renderToStaticMarkup(createElement(Example)),
    "<output>false</output>",
  );
});

test("the app starts with a round list while the website retains its calendar default", async () => {
  for (const compact of [false, true]) {
    const view = mount();
    function Example() {
      const data = useFairway();
      return createElement(Parties, {
        data,
        compact,
        calendarDate: "2026-11-02",
        onCalendarDateChange() {},
        onCreate() {},
        onOpen() {},
      });
    }
    try {
      await act(async () => view.root.render(createElement(Example)));
      assert.equal(
        !!view.container.querySelector(
          '[aria-label="Calendario mensual de parties"]',
        ),
        !compact,
      );
      assert.equal(
        !!view.container.querySelector(".party-planner-hero"),
        false,
      );
      if (compact) {
        const calendar = view.container.querySelector(
          '[aria-label="Ver calendario mensual"]',
        );
        assert.ok(calendar);
        await act(async () => (calendar as HTMLButtonElement).click());
        assert.ok(
          view.container.querySelector(
            '[aria-label="Calendario mensual de parties"]',
          ),
        );
      }
    } finally {
      await view.cleanup();
    }
  }
});
