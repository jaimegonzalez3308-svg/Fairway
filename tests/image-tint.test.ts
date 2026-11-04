import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tintFromPixels, tintPalette } from "../lib/image-tint";

const pixels = (...colors: [number, number, number, number?][]) =>
  colors.flatMap(([r, g, b, a = 255]) => [r, g, b, a]);

test("a photo's tint favours colourful mid-tones over white sky and shadow", () => {
  const grass: [number, number, number] = [60, 140, 60];
  const tint = tintFromPixels(
    pixels(
      grass,
      grass,
      [250, 250, 250],
      [252, 252, 252],
      [5, 5, 5],
      [8, 8, 8],
    ),
  )!;
  assert.ok(tint.g > tint.r + 40 && tint.g > tint.b + 40, JSON.stringify(tint));
});

test("transparent and empty images give no tint; greyscale stays neutral", () => {
  assert.equal(tintFromPixels([]), null);
  assert.equal(tintFromPixels(pixels([200, 30, 30, 0])), null);
  const grey = tintFromPixels(pixels([255, 255, 255], [0, 0, 0]))!;
  assert.ok(grey.r === grey.g && grey.g === grey.b, JSON.stringify(grey));
  assert.match(tintPalette(grey).soft, /^hsl\(0 0% 93%\)$/);
});

test("palette lightness is fixed so text contrast never depends on the photo", () => {
  for (const rgb of [
    { r: 255, g: 0, b: 0 },
    { r: 10, g: 10, b: 60 },
    { r: 240, g: 240, b: 200 },
  ]) {
    const { soft, accent } = tintPalette(rgb);
    assert.match(soft, /^hsl\(\d+ \d+% 93%\)$/);
    assert.match(accent, /^hsl\(\d+ \d+% 42%\)$/);
    // Saturation is capped so the wash stays calm.
    assert.ok(Number(soft.split(" ")[1].replace("%", "")) <= 45);
  }
});

test("tint styles only exist in the app and fall back to paper", () => {
  const css = readFileSync(
    new URL("../app/native-app.css", import.meta.url),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(css, /(^|\n)\.native-tint-backdrop \{\s*display: none;/);
  for (const block of css.split("}").filter((b) => b.includes("var(--tint-"))) {
    const selector = block.split("{").slice(-2, -1)[0] ?? "";
    for (const part of selector.split(/,(?![^(]*\))/))
      if (part.trim()) assert.match(part, /html\.native-ios/, part.trim());
  }
  // Card and sheet tints apply only once a tint was computed.
  assert.match(css, /\.golfer-card\[style\*="--tint-soft"\] \.golfer-details/);
  assert.match(css, /\.modal\[style\*="--tint-soft"\] \{/);
});
