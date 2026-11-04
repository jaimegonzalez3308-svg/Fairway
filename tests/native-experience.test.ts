import { test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { isIOSApp } from "../lib/native-app";
import { useNativeApp } from "../lib/use-native-app";
import { useFairway } from "../lib/use-fairway";
import { Parties } from "../components/parties";
import {
  NativeWelcome,
  NativeTour,
  NativeTabBar,
  NativeQuickActions,
} from "../components/native-experience";

import { websiteTourSteps } from "../lib/native-tour";

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

test("the center app action creates a story without navigating, while the other tabs retain their destinations", async () => {
  const view = mount();
  const destinations: string[] = [];
  let created = 0;
  try {
    await act(async () =>
      view.root.render(
        createElement(NativeTabBar, {
          page: "mensajes",
          unreadMessages: 3,
          onCreateStory: () => {
            created++;
          },
          onNavigate: (page) => destinations.push(page),
        }),
      ),
    );
    const buttons = Array.from(view.container.querySelectorAll("button"));
    assert.equal(buttons.length, 5);
    assert.match(
      view.container.querySelector('[aria-current="page"]')?.textContent || "",
      /Mensajes$/,
    );
    assert.ok(
      view.container.querySelector('[aria-label="3 mensajes sin leer"]'),
    );
    assert.equal(buttons[2].getAttribute("aria-label"), "Crear historia");
    assert.equal(buttons[2].getAttribute("aria-haspopup"), "dialog");
    assert.equal(buttons[2].getAttribute("aria-current"), null);
    for (const button of buttons) await act(async () => button.click());
    assert.deepEqual(destinations, [
      "descubrir",
      "partidas",
      "mensajes",
      "perfil",
    ]);
    assert.equal(created, 1);
    await act(async () =>
      view.root.render(
        createElement(NativeTabBar, {
          page: "mensajes",
          inert: true,
          onNavigate() {},
          onCreateStory() {},
        }),
      ),
    );
    assert.ok(view.container.querySelector("nav[inert]"));
  } finally {
    await view.cleanup();
  }
});

test("quick actions keep game and score creation while the story action lives in the bottom bar", async () => {
  const view = mount();
  const actions: string[] = [];
  try {
    await act(async () =>
      view.root.render(
        createElement(NativeQuickActions, {
          onCreate: () => actions.push("create"),
          onScore: () => actions.push("score"),
        }),
      ),
    );
    assert.deepEqual(actions, []);
    for (const button of view.container.querySelectorAll("button"))
      await act(async () => button.click());
    assert.deepEqual(actions, ["create", "score"]);
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

test("website tour advances all six screens, focuses the next heading and supports skip", async () => {
  const view = mount();
  let completed = 0;
  let skipped = 0;
  function Example() {
    const [step, setStep] = useState(0);
    return createElement(NativeTour, {
      website: true,
      steps: websiteTourSteps,
      step,
      onNext: () =>
        step === websiteTourSteps.length - 1 ? completed++ : setStep(step + 1),
      onSkip: () => {
        skipped++;
      },
    });
  }
  try {
    await act(async () => view.root.render(createElement(Example)));
    assert.ok(view.container.querySelector(".website-tour"));
    assert.notEqual(
      view.dom.window.document.activeElement,
      view.container.querySelector("h2"),
    );
    for (const [i, step] of websiteTourSteps.entries()) {
      assert.equal(view.container.querySelector("h2")?.textContent, step.title);
      assert.match(
        view.container.querySelector(".native-tour-count")!.textContent!,
        new RegExp(`${i + 1} de 6`),
      );
      if (i)
        assert.equal(
          view.dom.window.document.activeElement,
          view.container.querySelector("h2"),
        );
      const next =
        view.container.querySelector<HTMLButtonElement>(".native-tour-next")!;
      assert.match(next.textContent!, i === 5 ? /Empezar/ : /Siguiente/);
      await act(async () => next.click());
    }
    assert.equal(completed, 1);
    await act(async () =>
      view.container
        .querySelector<HTMLButtonElement>(".native-tour-skip")!
        .click(),
    );
    assert.equal(skipped, 1);
  } finally {
    await view.cleanup();
  }
});
