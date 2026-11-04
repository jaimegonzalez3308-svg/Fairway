import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";

const globals = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const nativeCss = readFileSync(
  new URL("../app/native-app.css", import.meta.url),
  "utf8",
);
const app = readFileSync(
  new URL("../components/fairway-app.tsx", import.meta.url),
  "utf8",
);

test("profile stats, streak and golfer rounds render on the website too", () => {
  assert.doesNotMatch(
    app,
    /\{nativeApp && \(\s*<ul\s+className="native-profile-stats"/,
  );
  assert.match(app, /const streak = roundStreak\(data\.rounds\);/);
  const profile = app.slice(app.indexOf('{page === "perfil" && ('));
  assert.ok(
    profile.indexOf("{streak && (") < profile.indexOf("{nativeApp && ("),
  );
});

test("on the website the stats replace the separate handicap block", () => {
  const dom = new JSDOM(
    `<html><head><style>${globals}</style><style>${nativeCss}</style></head><body><div class="profile-cover-content"><ul class="native-profile-stats"><li><button>1</button></li><li><strong>0</strong></li></ul><div class="profile-hcp">0</div></div><p class="native-streak">x</p></body></html>`,
    { virtualConsole: new VirtualConsole() },
  );
  const style = (s: string) =>
    dom.window.getComputedStyle(dom.window.document.querySelector(s)!);
  assert.equal(style(".native-profile-stats").display, "flex");
  assert.equal(style(".profile-hcp").display, "none");
  assert.equal(style(".native-streak").display, "flex");
  // Only the button cells are rounded, so dividers stay straight.
  assert.equal(
    style(".native-profile-stats li:not(:has(button))").borderRadius,
    "",
  );
  dom.window.close();
});

test("website adaptations keep small text at 4.5:1 and wrap stats before they crowd", () => {
  const block = globals.slice(
    globals.indexOf("/* Website adaptations of the app's"),
  );
  assert.doesNotMatch(block, /#7d8a78/);
  assert.match(
    block,
    /@media \(max-width: 1100px\) \{\s*html:not\(\.native-ios\) \.profile-cover-content \{\s*flex-wrap: wrap;/,
  );
});
