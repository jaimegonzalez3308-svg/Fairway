import { test } from "node:test";
import assert from "node:assert/strict";
import { headerShouldHide, pageMotion } from "../lib/use-native-feel";
import {
  nativeTourSteps,
  nativeTourKey,
  shouldStartTour,
} from "../lib/native-tour";

const tabs = ["descubrir", "partidas", "amigos", "mensajes", "perfil"];

test("header hides scrolling down past it and returns scrolling up", () => {
  assert.equal(headerShouldHide(100, 200, false), true);
  assert.equal(headerShouldHide(600, 480, true), false);
  assert.equal(
    headerShouldHide(300, 302, true),
    true,
    "small jitter keeps state",
  );
  assert.equal(
    headerShouldHide(200, 40, true),
    false,
    "always shown near the top",
  );
});

test("secondary screens slide forward, return slides back, tabs fade", () => {
  assert.equal(pageMotion("descubrir", "comunidad", tabs), "forward");
  assert.equal(pageMotion("comunidad", "perfil", tabs), "back");
  assert.equal(pageMotion("descubrir", "amigos", tabs), "tab");
  assert.equal(pageMotion("amigos", "amigos", tabs), null);
});

test("the tour visits every tab once and is remembered per account", () => {
  assert.deepEqual(
    nativeTourSteps.map((s) => s.tab),
    tabs,
  );
  assert.notEqual(nativeTourKey("a"), nativeTourKey("b"));
});

test("the tour starts only for a signed-in first open on Descubrir", () => {
  const base = {
    native: true,
    loading: false,
    userId: "u1",
    page: "descubrir",
    busy: false,
    seen: false,
  };
  assert.equal(shouldStartTour(base), true);
  assert.equal(shouldStartTour({ ...base, userId: null }), false, "no account");
  assert.equal(
    shouldStartTour({ ...base, page: "partidas" }),
    false,
    "deep link",
  );
  assert.equal(shouldStartTour({ ...base, seen: true }), false, "already seen");
  assert.equal(shouldStartTour({ ...base, busy: true }), false, "sheet open");
  assert.equal(shouldStartTour({ ...base, native: false }), false, "website");
});
