import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compatibility,
  matchesFilters,
  initialFilters,
  summarize,
  holeColor,
  profileSchema,
} from "../lib/domain";
import { demoMe, demoProfiles } from "../lib/demo";
test("compatibilidad determinista, explicable y de 0 a 100", () => {
  assert.equal(compatibility(demoMe, demoProfiles[0]).score, 100);
  const b = {
    ...demoMe,
    club_id: null,
    availability: ["Lunes"],
    holes: 9,
    style: "competitivo",
    handicap: null,
  };
  assert.equal(compatibility(demoMe, b).score, 0);
  assert.equal(compatibility(demoMe, demoProfiles[0]).reasons.length, 5);
});
test("filtros combinados no excluyen por defecto a quien carece de handicap", () => {
  assert.equal(matchesFilters(demoProfiles[3], initialFilters, demoMe), true);
  assert.equal(
    matchesFilters(
      demoProfiles[3],
      { ...initialFilters, noHcp: false },
      demoMe,
    ),
    false,
  );
  assert.equal(
    matchesFilters(
      demoProfiles[0],
      {
        ...initialFilters,
        club: "mine",
        minHcp: 5,
        maxHcp: 20,
        minAge: 18,
        maxAge: 30,
        day: "Sábado",
      },
      demoMe,
    ),
    true,
  );
  assert.equal(
    matchesFilters(
      demoProfiles[1],
      { ...initialFilters, club: "mine" },
      demoMe,
    ),
    false,
  );
});
test("scorecards: golpes, ida/vuelta y resultados por hoyo", () => {
  const rows = [
    { hole: 1, par: 4, strokes: 3 },
    { hole: 2, par: 3, strokes: 3 },
    { hole: 3, par: 5, strokes: 6 },
    { hole: 4, par: 4, strokes: 6 },
    { hole: 5, par: 5, strokes: 3 },
  ];
  const s = summarize(rows);
  assert.equal(s.total, 21);
  assert.equal(s.relative, 0);
  assert.equal(s.birdies, 1);
  assert.equal(s.pars, 1);
  assert.equal(s.bogeys, 1);
  assert.equal(s.doubles, 1);
  assert.equal(holeColor(rows[4]), "eagle");
  assert.equal(holeColor(rows[3]), "double");
});
test("sin par no se inventa resultado contra par; borradores incompletos", () => {
  const s = summarize([
    { hole: 1, par: null, strokes: 5 },
    { hole: 2, par: 4, strokes: null },
  ]);
  assert.equal(s.relative, null);
  assert.equal(s.total, 5);
  assert.equal(s.complete, false);
  assert.equal(s.birdies, 0);
});
test("onboarding rechaza menores de edad", () => {
  assert.equal(profileSchema.safeParse({ ...demoMe, age: 17 }).success, false);
});
