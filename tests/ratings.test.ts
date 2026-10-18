import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  canRatePlayer,
  ratingColumns,
  ratingLabel,
  reviewForPlayer,
  reviewValue,
  withRating,
} from "../lib/ratings";
import { StarRatingInput, PlayerRating } from "../components/player-rating";
import { ReviewForm } from "../components/forms";
import { demoMe } from "../lib/demo";
import type { Game } from "../lib/domain";
import type { FairwayData } from "../lib/use-fairway";

const game = {
  id: "game",
  status: "finished",
  participants: [
    { user_id: "a", status: "confirmed" },
    { user_id: "b", status: "confirmed" },
    { user_id: "c", status: "requested" },
  ],
} as Game;

test("una estrella global conserva su valor en el promedio existente y rechaza valores inválidos", () => {
  for (const score of [1, 2, 3, 4, 5])
    assert.equal(reviewValue(ratingColumns(score)), score);
  for (const score of [0, 6, -1, 2.5, NaN, Infinity])
    assert.throws(() => ratingColumns(score));
  assert.equal(
    reviewValue({ punctuality: 1, respect: 2, pace: 3, company: 4 }),
    2.5,
  );
});

test("solo califican compañeros confirmados de una partida finalizada y una vez por partida", () => {
  assert.equal(canRatePlayer(game, "a", "b", []), true);
  assert.equal(canRatePlayer(game, "b", "a", []), true);
  for (const [reviewer, target] of [
    [undefined, "b"],
    ["a", "a"],
    ["c", "b"],
    ["a", "c"],
    ["outsider", "b"],
  ])
    assert.equal(canRatePlayer(game, reviewer, target!, []), false);
  for (const status of ["open", "full", "cancelled"])
    assert.equal(canRatePlayer({ ...game, status }, "a", "b", []), false);
  const review = { game_id: game.id, target_id: "b", ...ratingColumns(4) };
  assert.equal(canRatePlayer(game, "a", "b", [review]), false);
  assert.equal(reviewForPlayer([review], game.id, "b"), review);
  assert.equal(
    canRatePlayer({ ...game, id: "another-game" }, "a", "b", [review]),
    true,
  );
});

test("el resumen se asigna por persona, también al propio perfil, sin conservar promedios antiguos", () => {
  const profile = { ...demoMe, id: "a", rating: 5, review_count: 1 };
  const rated = withRating(profile, [
    { user_id: "b", rating: 1, review_count: 8 },
    { user_id: "a", rating: 3, review_count: 2 },
  ]);
  assert.equal(rated.rating, 3);
  assert.equal(rated.review_count, 2);
  assert.equal(ratingLabel(rated), "3.0 de 5 · 2 calificaciones");
  assert.equal(
    ratingLabel(withRating(profile, [])),
    "Sin calificaciones todavía",
  );
  assert.equal(
    ratingLabel({ rating: 4, review_count: 1 }),
    "4.0 de 5 · 1 calificación",
  );
});

test("el selector usa cinco radios nativos etiquetados y requiere una elección explícita", () => {
  const empty = renderToStaticMarkup(
    createElement(StarRatingInput, { value: 0, onChange: () => {} }),
  );
  assert.equal([...empty.matchAll(/type="radio"/g)].length, 5);
  assert.equal([...empty.matchAll(/required=""/g)].length, 5);
  assert.doesNotMatch(empty, /checked=""/);
  for (let score = 1; score <= 5; score++)
    assert.ok(empty.includes(`aria-label="${score} de 5 estrellas"`));
  const chosen = renderToStaticMarkup(
    createElement(StarRatingInput, { value: 3, onChange: () => {} }),
  );
  assert.equal([...chosen.matchAll(/checked=""/g)].length, 1);
  assert.match(chosen, /checked="" value="3"|value="3"[^>]*checked=""/);
});

test("un perfil sin votos no aparenta cero estrellas y un promedio fraccionario tiene texto exacto", () => {
  const empty = renderToStaticMarkup(
    createElement(PlayerRating, { profile: {} }),
  );
  assert.match(empty, /Sin calificaciones todavía/);
  assert.doesNotMatch(empty, /player-rating-stars/);
  const rated = renderToStaticMarkup(
    createElement(PlayerRating, { profile: { rating: 4.3, review_count: 7 } }),
  );
  assert.match(rated, /4.3 de 5 · 7 calificaciones/);
  const widths = [...rated.matchAll(/width:([\d.]+)%/g)].map((match) =>
    Number(match[1]),
  );
  assert.equal(widths.filter((width) => width === 100).length, 4);
  assert.ok(Math.abs(widths[4] - 30) < 0.01);
});

test("el formulario no permite enviar sin estrellas y bloquea un compañero ya calificado", () => {
  const target = { ...demoMe, id: "b" };
  const data = { user: { id: "a" }, myReviews: [] } as unknown as FairwayData;
  const initial = renderToStaticMarkup(
    createElement(ReviewForm, { data, game, target, onDone: () => {} }),
  );
  assert.match(initial, /<button[^>]*disabled=""[^>]*>Enviar calificación/);
  const submitted = renderToStaticMarkup(
    createElement(ReviewForm, {
      data: {
        ...data,
        myReviews: [{ game_id: game.id, target_id: "b", ...ratingColumns(4) }],
      },
      game,
      target,
      onDone: () => {},
    }),
  );
  assert.match(submitted, /Solo puedes calificar una vez/);
  assert.match(submitted, /<fieldset[^>]*disabled=""/);
});
