import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";

const stories = readFileSync(
  new URL("../components/stories.tsx", import.meta.url),
  "utf8",
);
const globals = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const nativeCss = readFileSync(
  new URL("../app/native-app.css", import.meta.url),
  "utf8",
);

test("story tiles sign thumbnails in one batch, only in the app, decoratively", () => {
  assert.match(stories, /const thumbStories = native\s*\?/);
  assert.match(stories, /\.createSignedUrls\(thumbKey\.split\("\|"\), seconds\)/);
  // Never signed past the earliest shown story's expiry, never > 5 minutes,
  // expired stories excluded, and renewed before the batch lapses.
  assert.match(stories, /Math\.min\(\s*300,\s*Math\.floor\(\(thumbExpiry - Date\.now\(\)\) \/ 1000\),?\s*\)/);
  assert.match(stories, /new Date\(s\.expires_at\)\.getTime\(\) > Date\.now\(\)/);
  assert.match(stories, /setThumbTick\(\(tick\) => tick \+ 1\)/);
  assert.match(
    stories,
    /className="story-tile-photo"[\s\S]{0,200}alt=""\s*aria-hidden="true"/,
  );
});

test("community cards and story tiles apply in the app; the website is unchanged", () => {
  const markup = `<div class="native-app"><main data-page="comunidad"><div class="stories-rail"><button class="story-circle"><img class="story-tile-photo" alt=""><span class="story-ring"></span><strong>Ana</strong></button></div><article class="panel post"><div class="post-actions"><button class="liked">1</button></div></article></main></div>`;
  for (const app of [false, true]) {
    const dom = new JSDOM(
      `<html class="${app ? "native-ios" : ""}"><head><style>${globals}</style><style>${nativeCss}</style></head><body>${markup}</body></html>`,
      { virtualConsole: new VirtualConsole() },
    );
    const style = (s: string) =>
      dom.window.getComputedStyle(dom.window.document.querySelector(s)!);
    assert.equal(style(".story-circle").height === "132px", app);
    assert.equal(style(".post").borderRadius === "24px", app);
    dom.window.close();
  }
});
