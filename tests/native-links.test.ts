import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNativeLink } from "../lib/native-links";
import { gestureIntent } from "../lib/use-native-shell";
import { site } from "../lib/site";
import { serviceConfiguration } from "../scripts/configure-ios-services.mjs";
import {
  appleJWT,
  nonceHash,
  pushPayload,
  verifyAppleToken,
} from "../supabase/functions/_shared/apple-services";

test("Apple deletion validates the signing key, nonce, audience, expiry and exact account", async () => {
  const key = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const publicKey = {
    ...(await crypto.subtle.exportKey("jwk", key.publicKey)),
    kid: "APPLE_TEST",
  };
  const now = 10000;
  const nonce = "test-device-nonce";
  const claims = {
    iss: "https://appleid.apple.com",
    aud: "com.fairway.app",
    sub: "apple-user",
    iat: now,
    exp: now + 300,
    nonce: await nonceHash(nonce),
  };
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "RS256", kid: "APPLE_TEST" });
  const payload = encode(claims);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key.privateKey,
    new TextEncoder().encode(header + "." + payload),
  );
  const token =
    header + "." + payload + "." + Buffer.from(signature).toString("base64url");
  const expected = {
    subject: "apple-user",
    clientId: "com.fairway.app",
    nonce,
    now,
  };
  assert.deepEqual(
    await verifyAppleToken(token, expected, [publicKey]),
    claims,
  );
  for (const change of [
    { subject: "another-user" },
    { clientId: "another.app" },
    { nonce: "wrong-nonce" },
    { now: now + 1000 },
  ])
    await assert.rejects(
      verifyAppleToken(token, { ...expected, ...change }, [publicKey]),
    );
  await assert.rejects(
    verifyAppleToken(token, expected, [{ ...publicKey, kid: "UNKNOWN" }]),
  );
  await assert.rejects(
    verifyAppleToken(
      header +
        "." +
        encode({ ...claims, sub: "forged-user" }) +
        "." +
        Buffer.from(signature).toString("base64url"),
      expected,
      [publicKey],
    ),
  );
});

test("native links accept only approved navigation and keep authentication callbacks separate", () => {
  const id = "b1efb86c-4e02-4ad5-b942-0c4c7b48ebcb";
  assert.equal(
    parseNativeLink(`com.fairway.app://open?screen=scores`),
    "/#scores",
  );
  assert.equal(
    parseNativeLink(`${site.url}?partida=${id}&next=https://evil.test`),
    `/?partida=${id}#partidas`,
  );
  assert.equal(
    parseNativeLink(`${site.url}?golfista=${id}`),
    `/?golfista=${id}#amigos`,
  );
  for (const url of [
    "javascript:alert(1)",
    "https://evil.test/?partida=" + id,
    "com.fairway.app://auth/callback?code=x",
    "com.fairway.app://open?access_token=secret",
    site.url + "?code=secret",
    site.url + "#access_token=secret",
    site.url + "?golfista=bad",
    site.url + "legal/privacidad/",
    "com.fairway.app://user@open?screen=scores",
  ])
    assert.equal(parseNativeLink(url), null, url);
  assert.equal(
    parseNativeLink("com.fairway.app://open?screen=admin"),
    "/#descubrir",
  );
});

test("gestures require clear direction, screen edge or top; incidental drags do nothing", () => {
  assert.equal(gestureIntent(90, 5, true, false), "back");
  assert.equal(gestureIntent(90, 5, false, false), null);
  assert.equal(gestureIntent(5, 100, false, true), "refresh");
  assert.equal(gestureIntent(5, 100, false, false), null);
  assert.equal(gestureIntent(80, 90, true, true), null);
  assert.equal(gestureIntent(20, 20, true, true), null);
  assert.equal(gestureIntent(-100, 3, true, true), null);
});

test("service files require a real-shaped team and hostname, and keep push explicitly opt-in", () => {
  assert.throws(() =>
    serviceConfiguration({ teamId: "", host: "example.test" }),
  );
  assert.throws(() =>
    serviceConfiguration({
      teamId: "ABCD123456",
      host: "https://evil.test/path",
    }),
  );
  const config = serviceConfiguration({
    teamId: "ABCD123456",
    host: "example.test",
  });
  assert.equal(config.entitlements["aps-environment"], undefined);
  assert.deepEqual(config.association.applinks.details[0].appIDs, [
    "ABCD123456.com.fairway.app",
  ]);
  assert.deepEqual(
    config.entitlements["com.apple.developer.associated-domains"],
    ["applinks:example.test"],
  );
});

test("Apple service JWTs use verifiable ES256 and push previews contain no personal content", async () => {
  const key = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const exported = Buffer.from(
    await crypto.subtle.exportKey("pkcs8", key.privateKey),
  ).toString("base64");
  const jwt = await appleJWT(
    `-----BEGIN PRIVATE KEY-----\n${exported}\n-----END PRIVATE KEY-----`,
    "TESTKEYID",
    { iss: "TESTTEAMID", iat: 100 },
  );
  const [header, payload, signature] = jwt.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url").toString()), {
    alg: "ES256",
    kid: "TESTKEYID",
  });
  assert.equal(
    await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key.publicKey,
      Buffer.from(signature, "base64url"),
      new TextEncoder().encode(header + "." + payload),
    ),
    true,
  );
  assert.equal(
    await nonceHash("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  const notification = pushPayload("messages");
  assert.equal(notification.url, "com.fairway.app://open?screen=mensajes");
  assert.deepEqual(Object.keys(notification), ["aps", "url"]);
  assert.equal(JSON.stringify(notification).includes("sender"), false);
});
