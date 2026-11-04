import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GolferRounds, roundDateLabel } from "../components/golfer-rounds";

test("round dates are calendar dates, never shifted by time zone", () => {
  assert.match(roundDateLabel("2026-11-02"), /^2 nov/);
  assert.match(roundDateLabel("2026-01-01"), /^1 ene/);
  assert.equal(roundDateLabel("nope"), "");
});

test("a golfer's rounds start loading and are labelled for VoiceOver", () => {
  const html = renderToStaticMarkup(
    createElement(GolferRounds, { userId: "u1", name: "Ana López", clubs: [] }),
  );
  assert.match(html, /aria-label="Rondas de Ana López"/);
  assert.match(html, /Rondas recientes/);
  assert.match(html, /role="status"[^>]*>Cargando rondas…/);
});

test("Mi perfil keeps stats in the profile card and links Amigos to a sheet", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(
    new URL("../components/fairway-app.tsx", import.meta.url),
    "utf8",
  );
  const cover = source.slice(
    source.indexOf('<div className="profile-cover-content">'),
  );
  assert.ok(
    cover.indexOf('className="native-profile-stats"') <
      cover.indexOf('<div className="profile-hcp">'),
  );
  assert.match(source, /onClick=\{\(\) => setModal\("my-friends"\)\}/);
  assert.match(source, /modal === "my-friends"/);
  // Only other golfers' sheets load rounds, and only in the app.
  assert.match(
    source,
    /nativeApp && selected\.id !== data\.me\.id && \(\s*<GolferRounds/,
  );
});
