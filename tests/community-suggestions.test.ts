import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestFollows } from "../lib/community-suggestions";
import type { Profile } from "../lib/domain";

const person = (id: string, extra: Partial<Profile> = {}) =>
  ({
    id,
    name: id,
    city: "Querétaro",
    club_id: null,
    visibility: "public",
    ...extra,
  }) as Profile;

const me = person("me", { city: "León", club_id: "campestre" });

test("suggests clubmates first, then same city, keeping the original order", () => {
  const ids = suggestFollows(
    me,
    [
      person("far"),
      person("city", { city: "León" }),
      person("club", { club_id: "campestre" }),
    ],
    [],
  ).map((p) => p.id);
  assert.deepEqual(ids, ["club", "city", "far"]);
});

test("skips the viewer, private profiles and people already followed", () => {
  const ids = suggestFollows(
    me,
    [
      me,
      person("private", { visibility: "private" }),
      person("followed"),
      person("open"),
    ],
    ["followed"],
  ).map((p) => p.id);
  assert.deepEqual(ids, ["open"]);
});

test("keeps someone followed during this visit so their button stays put", () => {
  const ids = suggestFollows(me, [person("just")], ["just"], ["just"]).map(
    (p) => p.id,
  );
  assert.deepEqual(ids, ["just"]);
});

test("limits the list", () => {
  const many = Array.from({ length: 9 }, (_, i) => person(`p${i}`));
  assert.equal(suggestFollows(me, many, []).length, 4);
});
