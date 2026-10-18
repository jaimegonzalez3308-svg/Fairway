/** Checks the actual exported HTML/assets before publishing. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const home = readFileSync("out/index.html", "utf8");
const missing = readFileSync("out/404.html", "utf8");
const tags = (html, name) =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map(([tag]) => ({
    __raw: tag,
    ...Object.fromEntries(
      [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [
        key,
        value,
      ]),
    ),
  }));
const meta = tags(home, "meta");
const canonical = tags(home, "link").filter((tag) => tag.rel === "canonical");
assert.equal(canonical.length, 1, "Homepage must have one canonical URL");
const url = new URL(canonical[0].href);
assert.equal(url.protocol, "https:");
assert.equal(url.pathname, "/");
assert.equal(url.search + url.hash, "");
const findMeta = (name) =>
  meta.find((tag) => tag.name === name || tag.property === name)?.content;
assert.match(findMeta("description"), /León/);
assert.match(home, /<title>Fairway.*León<\/title>/);
assert.match(home, /<h1[^>]*>Golfistas y partidas en León<\/h1>/);
assert.equal(findMeta("og:url"), url.href);
assert.equal(findMeta("twitter:card"), "summary_large_image");
const image = new URL(findMeta("og:image"));
assert.equal(image.origin, url.origin);
assert.equal(findMeta("twitter:image"), image.href);
const png = readFileSync(path.join("out", image.pathname));
assert.equal(png.subarray(1, 4).toString(), "PNG");
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
const jsonLd = JSON.parse(
  home.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1],
);
assert.equal(jsonLd["@type"], "WebSite");
assert.equal(jsonLd.name, "Fairway");
assert.equal(jsonLd.url, url.href);
assert.match(missing, /Esta página no existe/);
assert.ok(
  tags(missing, "meta").some(
    (tag) => tag.name === "robots" && tag.content.includes("noindex"),
  ),
);
assert.match(missing, /href="\/"[^>]*>.*?Volver a Fairway/s);
const robots = readFileSync("out/robots.txt", "utf8");
assert.ok(robots.includes(`Sitemap: ${new URL("sitemap.xml", url).href}`));
const sitemap = readFileSync("out/sitemap.xml", "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  ([, value]) => value,
);
assert.deepEqual(
  urls,
  [url.href],
  "Only canonical public URLs belong in the sitemap",
);
const files = (dir) =>
  readdirSync(dir).flatMap((file) => {
    const name = path.join(dir, file);
    return statSync(name).isDirectory() ? files(name) : [name];
  });
assert.equal(
  files("out").filter((file) => file.endsWith(".map")).length,
  0,
  "No production source maps",
);
const scripts = tags(home, "script")
  .filter((tag) => tag.src && !/\bnomodule/i.test(tag.__raw))
  .map((tag) => readFileSync(path.join("out", tag.src)));
console.log(
  "Export checks passed: metadata, canonical, share image, WebSite schema, 404, robots, sitemap and source maps.",
);
console.log(
  JSON.stringify({
    initialScriptBytes: scripts.reduce((sum, file) => sum + file.length, 0),
    gzipScriptBytes: scripts.reduce(
      (sum, file) => sum + gzipSync(file).length,
      0,
    ),
  }),
);
