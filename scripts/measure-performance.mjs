/** Export-size comparison, not a Lighthouse or real-user timing measurement. */
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";

const directory = process.argv[2] || "out";
const html = readFileSync(path.join(directory, "index.html"), "utf8");
const assets = (pattern) => [
  ...new Set([...html.matchAll(pattern)].map((m) => m[1])),
];
const scripts = [...html.matchAll(/<script\b[^>]*>/g)]
  .map(([tag]) => tag)
  .filter((tag) => !/\bnomodule/i.test(tag))
  .map((tag) => tag.match(/\bsrc="([^"]+)"/)?.[1])
  .filter(Boolean);
const read = (asset) => readFileSync(path.join(directory, asset));
const sum = (values) => values.reduce((total, value) => total + value, 0);
const fonts = assets(/<link\b(?=[^>]*as="font")[^>]*href="([^"]+)"/g);
const metrics = {
  initialJSBytes: sum(scripts.map((asset) => read(asset).length)),
  gzipJSBytes: sum(scripts.map((asset) => gzipSync(read(asset)).length)),
  preloadedFontBytes: sum(fonts.map((asset) => read(asset).length)),
  imageBytes: statSync(path.join(directory, "images/fairway-aerial.webp")).size,
};
const avif = path.join(directory, "images/fairway-aerial-1024.avif");
try {
  metrics.image1024AvifBytes = statSync(avif).size;
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
console.log(JSON.stringify(metrics, null, 2));
if (process.argv.includes("--check")) {
  assert.ok(
    metrics.gzipJSBytes < 285000,
    "Initial modern JS exceeds the 285 KB gzip budget",
  );
  assert.ok(metrics.preloadedFontBytes < 250000, "Font preloads exceed 250 KB");
  assert.ok(metrics.imageBytes < 225000, "Desktop WebP exceeds 225 KB");
  assert.ok(metrics.image1024AvifBytes < 80000, "1024 px AVIF exceeds 80 KB");
  console.log("Performance size budgets passed.");
}
