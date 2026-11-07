import { test } from "node:test";
import assert from "node:assert/strict";
import type { Game, Profile } from "../lib/domain";
import {
  canRepeatGame,
  gameTemplate,
  golfTime,
  inviteCandidates,
  inviteGroup,
  inviteGroupMessage,
  nextWeeklyStart,
  repeatInvitees,
} from "../lib/party-repeat";

const game = (over: Partial<Game> = {}): Game => ({
  id: "g1",
  host_id: "host",
  club_id: "club-1",
  // Saturday 8:10 in León (UTC−6).
  starts_at: "2026-10-31T14:10:00.000Z",
  holes: 18,
  capacity: 4,
  format: "Stroke play",
  kind: "competitivo",
  privacy: "invite",
  join_mode: "request",
  description: "La de los sábados",
  access_conditions: "Socios e invitados autorizados",
  status: "finished",
  participants: [
    { user_id: "host", status: "confirmed" },
    { user_id: "ana", status: "confirmed" },
    { user_id: "luis", status: "confirmed" },
    { user_id: "eva", status: "requested" },
    { user_id: "rex", status: "rejected" },
  ],
  ...over,
});
const person = (id: string): Profile =>
  ({ id, name: id.toUpperCase() }) as Profile;

test("party repeat: next same weekday and León time, always in the future", () => {
  const now = new Date("2026-11-06T18:00:00.000Z"); // Friday noon in León
  const next = nextWeeklyStart(game().starts_at, now);
  assert.equal(next.toISOString(), "2026-11-07T14:10:00.000Z");
  assert.equal(golfTime(next), "08:10");
  // Exactly at the repeat time it moves to the following week.
  assert.equal(
    nextWeeklyStart(game().starts_at, next).toISOString(),
    "2026-11-14T14:10:00.000Z",
  );
  // A future party repeats one week after it, not on the same day.
  assert.equal(
    nextWeeklyStart("2026-11-10T14:10:00.000Z", now).toISOString(),
    "2026-11-17T14:10:00.000Z",
  );
  // Crosses month and year.
  assert.equal(
    nextWeeklyStart(
      "2026-12-26T14:10:00.000Z",
      new Date("2026-12-27T00:00:00.000Z"),
    ).toISOString(),
    "2027-01-02T14:10:00.000Z",
  );
});

test("party repeat: León date/time does not depend on the device zone", () => {
  // 23:30 in León is already the next day in UTC.
  assert.equal(golfTime("2026-11-08T05:30:00.000Z"), "23:30");
  const template = gameTemplate(
    game({ starts_at: "2026-11-01T05:30:00.000Z" }),
    new Date("2026-11-03T00:00:00.000Z"),
  );
  assert.equal(template.date, "2026-11-07");
  assert.equal(template.time, "23:30");
});

test("party repeat: template copies every setting", () => {
  const now = new Date("2026-11-06T18:00:00.000Z");
  assert.deepEqual(gameTemplate(game(), now), {
    club_id: "club-1",
    date: "2026-11-07",
    time: "08:10",
    holes: 18,
    capacity: 4,
    format: "Stroke play",
    kind: "competitivo",
    privacy: "invite",
    join_mode: "request",
    description: "La de los sábados",
    access_conditions: "Socios e invitados autorizados",
  });
  assert.equal(
    gameTemplate(game({ join_mode: "open", privacy: "public" }), now)
      .join_mode,
    "open",
  );
  assert.equal(gameTemplate(game({ join_mode: undefined }), now).join_mode, "request");
});

test("party repeat: organizer or confirmed players, any status", () => {
  for (const status of ["open", "full", "finished", "cancelled"]) {
    assert.equal(canRepeatGame(game({ status }), "host"), true);
    assert.equal(canRepeatGame(game({ status }), "ana"), true);
  }
  assert.equal(canRepeatGame(game(), "eva"), false);
  assert.equal(canRepeatGame(game(), "rex"), false);
  assert.equal(canRepeatGame(game(), "stranger"), false);
  assert.equal(canRepeatGame(game(), undefined), false);
});

test("party repeat: invitees are last time's confirmed group minus me, visible only", () => {
  const visible = [person("ana"), person("luis"), person("host"), person("eva")];
  assert.deepEqual(
    repeatInvitees(game(), "host", visible).map((p) => p.id),
    ["ana", "luis"],
  );
  // A participant repeating it invites the former organizer too.
  assert.deepEqual(
    repeatInvitees(game(), "ana", visible).map((p) => p.id),
    ["host", "luis"],
  );
  // Profiles this account cannot see are left out; duplicates removed.
  assert.deepEqual(
    repeatInvitees(
      game({
        participants: [
          { user_id: "ana", status: "confirmed" },
          { user_id: "ana", status: "confirmed" },
          { user_id: "hidden", status: "confirmed" },
        ],
      }),
      "host",
      [person("ana"), person("ana")],
    ).map((p) => p.id),
    ["ana"],
  );
});

test("party invites: friends first, no duplicates or current players", () => {
  const { friends, others } = inviteCandidates(
    game(),
    "host",
    [person("ana"), person("zoe"), person("zoe")],
    [person("zoe"), person("max"), person("eva"), person("rex"), person("host")],
  );
  assert.deepEqual(friends.map((p) => p.id), ["zoe"]);
  assert.deepEqual(others.map((p) => p.id), ["max"]);
  const empty = inviteCandidates(game(), "host", [], []);
  assert.equal(empty.friends.length + empty.others.length, 0);
});

test("party invites: one call per player, failures named, never retried", async () => {
  const calls: string[] = [];
  const result = await inviteGroup(
    async (name, args) => {
      assert.equal(name, "invite_to_game");
      assert.equal(args.g, "new-game");
      calls.push(args.invitee);
      if (args.invitee === "luis") return { error: { message: "Invitación no permitida" } };
      if (args.invitee === "eva") throw new Error("offline");
      return { error: null };
    },
    "new-game",
    [person("ana"), person("luis"), person("eva"), person("max")],
  );
  assert.deepEqual(calls, ["ana", "luis", "eva", "max"]);
  assert.equal(result.sent, 2);
  assert.deepEqual(result.failed.map((p) => p.id), ["luis", "eva"]);
  assert.match(inviteGroupMessage(result), /no pudimos invitar a LUIS, EVA/);
  assert.match(
    inviteGroupMessage({ sent: 1, failed: [] }),
    /Invitamos a 1 jugador de la última vez/,
  );
  assert.match(
    inviteGroupMessage({ sent: 3, failed: [] }),
    /Invitamos a 3 jugadores/,
  );
});

test("party repeat: a dismissed repeat sheet never prefills a later new party", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(
    new URL("../components/fairway-app.tsx", import.meta.url),
    "utf8",
  );
  // Browser Back closes the sheet without close(), so the plan is cleared
  // whenever the create-game sheet is not the one open…
  assert.match(
    source,
    /useEffect\(\(\) => \{\s*if \(modal !== "create-game"\) setRepeatPlan\(null\);\s*\}, \[modal\]\);/,
  );
  // …and the ordinary "Crear partida" entry starts from a blank form.
  assert.match(
    source,
    /onCreate=\{\(\) => \{\s*setRepeatPlan\(null\);\s*setModal\("create-game"\);/,
  );
});
