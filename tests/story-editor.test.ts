import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STORY_FILTERS,
  STORY_FONTS,
  applyFilterPixels,
  cssFilter,
  displayText,
  inside,
  pinchChange,
  readableOn,
  textColors,
} from "../lib/story-editor";
import { readMuted, writeMuted } from "../lib/story-mute";

test("the editor offers at least five fonts and several filters", () => {
  assert.ok(STORY_FONTS.length >= 5);
  assert.ok(STORY_FILTERS.length >= 5);
  assert.equal(cssFilter({}), "none");
  assert.equal(
    cssFilter({ contrast: 1.1, grayscale: 1 }),
    "grayscale(1) contrast(1.1)",
    "preview and export apply filters in the same order",
  );
});

test("pixel filters match the CSS definitions", () => {
  const gray = applyFilterPixels(new Uint8ClampedArray([200, 40, 40, 255]), {
    grayscale: 1,
  });
  assert.ok(
    Math.abs(gray[0] - gray[1]) <= 1 && Math.abs(gray[1] - gray[2]) <= 1,
  );
  assert.equal(gray[3], 255, "alpha untouched");
  const bright = applyFilterPixels(
    new Uint8ClampedArray([100, 100, 100, 255]),
    {
      brightness: 2,
    },
  );
  assert.deepEqual([...bright].slice(0, 3), [200, 200, 200]);
  const clamped = applyFilterPixels(new Uint8ClampedArray([250, 0, 0, 255]), {
    contrast: 3,
  });
  assert.deepEqual([...clamped].slice(0, 3), [255, 0, 0]);
});

test("text stays readable on its background", () => {
  assert.equal(readableOn("#fffbf2"), "#16241c");
  assert.equal(readableOn("#193d2f"), "#fffbf2");
  assert.deepEqual(textColors({ color: "#fffbf2", background: "solid" }), {
    text: "#16241c",
    box: "#fffbf2",
  });
  assert.equal(textColors({ color: "#d6453d", background: "none" }).box, null);
  assert.equal(displayText({ text: "par", font: "fuerte" }), "PAR");
});

test("pinch gives scale and rotation; the bin hit test works", () => {
  const change = pinchChange(
    [
      [0, 0],
      [10, 0],
    ],
    [
      [0, 0],
      [0, 20],
    ],
  );
  assert.equal(change.scale, 2);
  assert.ok(Math.abs(change.rotation - Math.PI / 2) < 1e-9);
  const bin = { left: 0, top: 0, right: 10, bottom: 10 };
  assert.equal(inside({ x: 5, y: 5 }, bin), true);
  assert.equal(inside({ x: 15, y: 5 }, bin), false);
  assert.equal(inside({ x: 5, y: 5 }, null), false);
});

test("muted authors are kept per viewer", () => {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
  writeMuted("viewer", ["a", "a", "b"]);
  assert.deepEqual(readMuted("viewer"), ["a", "b"]);
  assert.deepEqual(readMuted("someone-else"), []);
  assert.deepEqual(readMuted(null), []);
});

test("editor text is moderated and spoken through a hidden caption", async () => {
  const { overlayCaption, storyText, OVERLAY_MARK } =
    await import("../lib/stories");
  const caption = overlayCaption(["  Birdie en el 7 ", "", "Hoyo 19"]);
  assert.equal(caption, `${OVERLAY_MARK}Birdie en el 7\nHoyo 19`);
  assert.deepEqual(storyText(caption), {
    visible: "",
    spoken: "Birdie en el 7\nHoyo 19",
  });
  assert.deepEqual(storyText("Gran ronda"), {
    visible: "Gran ronda",
    spoken: "Gran ronda",
  });
  assert.equal(overlayCaption(["  "]), "");
});
