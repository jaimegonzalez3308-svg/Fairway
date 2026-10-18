import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ratingFillPercent } from "../lib/ratings";
import { RatingBeer } from "../components/rating-beer";

test("the beer fill follows the 1–5 average and treats missing ratings as empty", () => {
  for (const [rating, fill] of [
    [1, 20],
    [2.5, 50],
    [4, 80],
    [4.3, 86],
    [5, 100],
  ])
    assert.equal(ratingFillPercent({ rating, review_count: 3 }), fill);
  for (const rating of [undefined, 0, -1, 6, NaN, Infinity])
    assert.equal(ratingFillPercent({ rating, review_count: 3 }), 0);
  assert.equal(ratingFillPercent({ rating: 5, review_count: 0 }), 0);
});

test("beer glasses keep independent fill clips and remain decorative beside the rating text", () => {
  const html = renderToStaticMarkup(
    createElement(
      "div",
      null,
      createElement(RatingBeer, { profile: { rating: 2.5, review_count: 2 } }),
      createElement(RatingBeer, {
        profile: { rating: 5, review_count: 1 },
        compact: true,
      }),
    ),
  );
  const ids = [...html.matchAll(/<clipPath id="([^"]+)"/g)].map(([, id]) => id);
  assert.equal(ids.length, 2);
  assert.notEqual(ids[0], ids[1]);
  for (const id of ids) assert.ok(html.includes(`clip-path="url(#${id})"`));
  assert.equal([...html.matchAll(/aria-hidden="true"/g)].length, 2);
  assert.equal([...html.matchAll(/focusable="false"/g)].length, 2);
  assert.match(html, /data-fill-percent="50"/);
  assert.match(html, /data-fill-percent="100"/);
  assert.match(html, /height="11\.5"/);
});
