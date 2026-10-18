import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ACCESSIBILITY_BOOTSTRAP,
  ACCESSIBILITY_STORAGE_KEY,
  readAccessibilityMode,
  saveAccessibilityMode,
} from "../lib/accessibility-mode";
import {
  AccessibilityProvider,
  AccessibilitySetting,
  AccessibilityToggle,
} from "../components/accessibility-mode";

test("accessibility mode defaults off and persists explicit on/off choices", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  assert.equal(readAccessibilityMode(storage), false);
  saveAccessibilityMode(storage, true);
  assert.equal(readAccessibilityMode(storage), true);
  saveAccessibilityMode(storage, false);
  assert.equal(readAccessibilityMode(storage), false);
  storage.setItem(ACCESSIBILITY_STORAGE_KEY, "invalid");
  assert.equal(readAccessibilityMode(storage), false);
});

test("blocked storage does not prevent using the page", () => {
  const storage = {
    getItem: () => {
      throw new Error("Storage blocked");
    },
    setItem: () => {
      throw new Error("Storage blocked");
    },
  };
  assert.equal(readAccessibilityMode(storage), false);
  assert.doesNotThrow(() => saveAccessibilityMode(storage, true));
  const document = { documentElement: { dataset: {} } };
  assert.doesNotThrow(() =>
    runInNewContext(ACCESSIBILITY_BOOTSTRAP, {
      document,
      localStorage: storage,
    }),
  );
  assert.doesNotThrow(() =>
    runInNewContext(ACCESSIBILITY_BOOTSTRAP, { document }),
  );
});

test("saved preference is applied before React starts on a new page", () => {
  for (const saved of [null, "false", "true", "invalid"]) {
    const dataset: Record<string, string> = {};
    runInNewContext(ACCESSIBILITY_BOOTSTRAP, {
      document: { documentElement: { dataset } },
      localStorage: {
        getItem: (key: string) => {
          assert.equal(key, ACCESSIBILITY_STORAGE_KEY);
          return saved;
        },
      },
    });
    assert.equal(dataset.accessibility, String(saved === "true"));
  }
});

test("server-rendered controls identify the preference and default to off", () => {
  const markup = renderToStaticMarkup(
    createElement(AccessibilityProvider, {
      children: createElement(
        "div",
        null,
        createElement(AccessibilitySetting),
        createElement(AccessibilityToggle),
      ),
    }),
  );
  assert.match(markup, /Modo de accesibilidad/);
  assert.match(markup, /aria-pressed="false"/);
  assert.doesNotMatch(markup, /checked=""/);
  const descriptionId = markup.match(/aria-describedby="([^"]+)"/)![1];
  assert.ok(markup.includes(`id="${descriptionId}"`));
  assert.match(markup, /role="status"/);
});
