import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CourseGuide } from "../components/course-guide";

test("course controls expose a selected part, names and a linked live explanation", () => {
  const html = renderToStaticMarkup(
    createElement(CourseGuide, { holes: 18, routeKey: "example" }),
  );
  const buttons = [...html.matchAll(/<button\b[^>]*>/g)].map(([tag]) => tag);
  assert.equal(buttons.length, 6);
  assert.ok(buttons.every((tag) => tag.includes('type="button"')));
  assert.equal(
    buttons.filter((tag) => tag.includes('aria-pressed="true"')).length,
    1,
  );
  const detailId = html.match(/aria-controls="([^"]+)"/)![1];
  assert.ok(html.includes(`id="${detailId}"`));
  assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/);
  for (const name of [
    "Tee box",
    "Fairway",
    "Rough",
    "Bunker",
    "Green",
    "Hazards",
  ])
    assert.ok(html.includes(name));
  assert.match(html, /RECORRIDO ILUSTRATIVO/);
});

test("multiple course diagrams do not share SVG definitions or explanation IDs", () => {
  const html = renderToStaticMarkup(
    createElement(
      "div",
      null,
      createElement(CourseGuide, { holes: 9, routeKey: "nine" }),
      createElement(CourseGuide, { holes: 18, routeKey: "eighteen" }),
    ),
  );
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(([, value]) => value);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of html.matchAll(/url\(#([^)]*)\)/g))
    assert.ok(ids.includes(id));
});
