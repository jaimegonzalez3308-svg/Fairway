import { test } from "node:test";
import assert from "node:assert/strict";
import { notificationDestination } from "../lib/notification-routes";

test("each notification category opens the section where you act on it", () => {
  assert.equal(notificationDestination("matches")?.page, "mensajes");
  assert.equal(notificationDestination("messages")?.page, "mensajes");
  assert.equal(notificationDestination("games")?.page, "partidas");
  assert.equal(notificationDestination("friends")?.page, "amigos");
  assert.equal(notificationDestination("social")?.page, "comunidad");
  assert.equal(notificationDestination("reviews")?.page, "perfil");
});

test("unknown categories stay as plain, non-navigating rows", () => {
  assert.equal(notificationDestination("system"), null);
  assert.equal(notificationDestination(""), null);
});

test("tapping a notification marks it read, closes the sheet and navigates", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(
    new URL("../components/fairway-app.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /onClick=\{\(\) => \{\s*data\.markNotificationRead\(n\.id\);\s*setModal\(null\);\s*go\(destination\.page\);\s*\}\}/,
  );
  const hook = readFileSync(
    new URL("../lib/use-fairway.ts", import.meta.url),
    "utf8",
  );
  // Only the read flag changes, and only on the member's own row.
  assert.match(
    hook,
    /\.update\(\{ read: true \}\)\s*\.eq\("id", id\)\s*\.eq\("user_id", user\.id\)/,
  );
});
