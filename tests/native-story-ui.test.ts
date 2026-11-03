import { test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { JSDOM } from "jsdom";
import { demoMe } from "../lib/demo";
import type { FairwayData } from "../lib/use-fairway";

async function mount(native = true) {
  const dom = new JSDOM(
    "<main id='main-content'><div id='root'></div></main>",
    { url: "http://127.0.0.1/" },
  );
  if (native) {
    dom.window.document.documentElement.classList.add("native-ios");
    Object.assign(dom.window, { Capacitor: { getPlatform: () => "ios" } });
  }
  dom.window.matchMedia = (() => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    location: dom.window.location,
    Document: dom.window.Document,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLButtonElement: dom.window.HTMLButtonElement,
    Element: dom.window.Element,
    DocumentFragment: dom.window.DocumentFragment,
    Node: dom.window.Node,
    NodeFilter: dom.window.NodeFilter,
    Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent,
    MutationObserver: dom.window.MutationObserver,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  const createUrl = URL.createObjectURL,
    revokeUrl = URL.revokeObjectURL;
  let urlId = 0;
  URL.createObjectURL = () => `blob:local-draft-${++urlId}`;
  URL.revokeObjectURL = () => {};
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(dom.window.document.getElementById("root")!);
  return {
    dom,
    root,
    async cleanup() {
      await act(async () => root.unmount());
      dom.window.close();
      URL.createObjectURL = createUrl;
      URL.revokeObjectURL = revokeUrl;
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}
const data = {
  user: { id: demoMe.id },
  me: demoMe,
  profiles: [],
  demo: false,
  notify() {},
} as unknown as FairwayData;

test("iPhone camera selection is single-flight, previews a draft and preserves it on cancel or failure", async () => {
  const view = await mount();
  let calls = 0,
    published = 0;
  let resolve!: (file: File | null) => void;
  let mode = "first";
  try {
    const { StoryComposer } = await import("../components/stories");
    await act(async () =>
      view.root.render(
        createElement(StoryComposer, {
          data,
          available: true,
          statusMessage: "",
          onClose() {},
          async onPublished() {
            published++;
          },
          async getNativePhoto() {
            calls++;
            if (mode === "cancel") return null;
            if (mode === "error") throw new Error("Camera permission denied");
            return new Promise<File | null>((done) => {
              resolve = done;
            });
          },
          async preparePhoto() {
            return new Blob(["prepared-jpeg"], { type: "image/jpeg" });
          },
        }),
      ),
    );
    assert.equal(view.dom.window.document.activeElement?.tagName, "H2");
    const camera = () =>
      Array.from(view.dom.window.document.querySelectorAll("button")).find(
        (b) => /Tomar foto|Volver a tomar/.test(b.textContent || ""),
      )!;
    await act(async () => {
      camera().click();
      camera().click();
    });
    assert.equal(calls, 1);
    await act(async () =>
      resolve(new File(["camera"], "photo.jpg", { type: "image/jpeg" })),
    );
    const preview = view.dom.window.document.querySelector(
      'img[alt="Vista previa de tu historia"]',
    );
    assert.ok(preview);
    const source = preview.getAttribute("src");
    assert.equal(published, 0);
    for (const attempt of ["cancel", "error"]) {
      mode = attempt;
      await act(async () => camera().click());
      assert.equal(
        view.dom.window.document
          .querySelector('img[alt="Vista previa de tu historia"]')
          ?.getAttribute("src"),
        source,
      );
      assert.equal(published, 0);
    }
    assert.ok(
      Array.from(view.dom.window.document.querySelectorAll("button")).some(
        (b) => b.textContent?.includes("Compartir historia"),
      ),
    );
    assert.ok(view.dom.window.document.querySelector('input[type="file"]'));
  } finally {
    await view.cleanup();
  }
});

test("browser story creation retains the existing file picker and autofocus", async () => {
  const view = await mount(false);
  try {
    const { StoryComposer } = await import("../components/stories");
    await act(async () =>
      view.root.render(
        createElement(StoryComposer, {
          data,
          available: true,
          statusMessage: "",
          onClose() {},
          async onPublished() {},
        }),
      ),
    );
    assert.equal(
      view.dom.window.document.querySelector(".native-story-sources"),
      null,
    );
    assert.ok(
      view.dom.window.document.querySelector(
        'input[aria-label="Elegir fotografía para historia"]',
      ),
    );
    assert.notEqual(view.dom.window.document.activeElement?.tagName, "H2");
  } finally {
    await view.cleanup();
  }
});

test("VoiceOver pauses native stories and a late accessibility toggle also pauses playback", async () => {
  const view = await mount();
  try {
    const { StoryViewer } = await import("../components/stories");
    const root = view.dom.window.document.documentElement;
    root.dataset.nativeScreenReader = "true";
    await act(async () =>
      view.root.render(
        createElement(StoryViewer, {
          data,
          siblings: [],
          canPrevious: false,
          onPrevious() {},
          onNext() {},
          onClose() {},
          onSeen() {},
          onLiked() {},
          async onRefresh() {},
        }),
      ),
    );
    assert.ok(
      view.dom.window.document.querySelector(
        'button[aria-label="Reanudar historia"]',
      ),
    );
    await act(async () =>
      (
        view.dom.window.document.querySelector(
          'button[aria-label="Reanudar historia"]',
        ) as HTMLButtonElement
      ).click(),
    );
    assert.ok(
      view.dom.window.document.querySelector(
        'button[aria-label="Pausar historia"]',
      ),
    );
    await act(async () => {
      root.dataset.accessibility = "true";
    });
    assert.ok(
      view.dom.window.document.querySelector(
        'button[aria-label="Reanudar historia"]',
      ),
    );
  } finally {
    await view.cleanup();
  }
});
