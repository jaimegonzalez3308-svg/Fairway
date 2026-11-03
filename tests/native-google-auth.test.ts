import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  NATIVE_GOOGLE_CALLBACK,
  nativeGoogleCode,
  signInWithNativeGoogle,
  type NativeGoogleDependencies,
} from "../lib/native-google-auth";

const origin = "https://auth.example.invalid";
type Destination = Parameters<typeof signInWithNativeGoogle>[2];

test("Google nativo rechaza callbacks ajenos, ambiguos y tokens del flujo web", () => {
  assert.equal(
    nativeGoogleCode(NATIVE_GOOGLE_CALLBACK + "?code=one-use"),
    "one-use",
  );
  for (const url of [
    "https://evil.example/auth/callback?code=x",
    "com.fairway.app://evil/callback?code=x",
    "com.fairway.app://auth/other?code=x",
    "com.fairway.app://person@auth/callback?code=x",
    NATIVE_GOOGLE_CALLBACK,
    NATIVE_GOOGLE_CALLBACK + "?code=",
    NATIVE_GOOGLE_CALLBACK + "?code=x&code=y",
    NATIVE_GOOGLE_CALLBACK + "#access_token=untrusted&refresh_token=untrusted",
    NATIVE_GOOGLE_CALLBACK + "?code=x#access_token=untrusted",
  ])
    assert.throws(() => nativeGoogleCode(url));
  assert.throws(
    () =>
      nativeGoogleCode(
        NATIVE_GOOGLE_CALLBACK +
          "?error=access_denied&error_description=untrusted-provider-message",
      ),
    (error: Error) =>
      /Google/.test(error.message) &&
      !error.message.includes("untrusted-provider-message"),
  );
});

test("Google nativo usa el SDK PKCE real y entrega la sesión al cliente de Fairway", async (t) => {
  let challenge = "";
  const requests: { code: string; verifier: string }[] = [];
  const saved: unknown[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      assert.equal(String(input), origin + "/auth/v1/token?grant_type=pkce");
      const body = JSON.parse(String(init?.body));
      requests.push({ code: body.auth_code, verifier: body.code_verifier });
      assert.equal(body.auth_code, "server-code");
      assert.equal(
        createHash("sha256").update(body.code_verifier).digest("base64url"),
        challenge,
      );
      return Response.json({
        access_token: "verified-access-token",
        refresh_token: "verified-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: { id: "test-user", aud: "authenticated" },
      });
    },
  );
  const destination = {
    setSession: async (tokens: unknown) => {
      saved.push(tokens);
      return { error: null };
    },
  } as Destination;
  await signInWithNativeGoogle(origin, "test-public-key", destination, {
    sheet: {
      authenticate: async ({ url }) => {
        const auth = new URL(url);
        assert.equal(auth.origin, origin);
        assert.equal(
          auth.searchParams.get("redirect_to"),
          NATIVE_GOOGLE_CALLBACK,
        );
        assert.equal(auth.searchParams.get("code_challenge_method"), "s256");
        assert.equal(auth.searchParams.get("prompt"), "select_account");
        challenge = auth.searchParams.get("code_challenge")!;
        assert.ok(challenge);
        assert.equal(saved.length, 0);
        return {
          cancelled: false,
          url: NATIVE_GOOGLE_CALLBACK + "?code=server-code",
        };
      },
    },
  });
  assert.equal(requests.length, 1);
  assert.deepEqual(saved, [
    {
      access_token: "verified-access-token",
      refresh_token: "verified-refresh-token",
    },
  ]);
});

test("cancelar la hoja no cambia la sesión y permite volver a abrirla", async () => {
  let sheets = 0;
  const destination = {
    setSession: async () => assert.fail("must not sign in"),
  } as Destination;
  const deps = {
    sheet: {
      authenticate: async () => {
        sheets++;
        return { cancelled: true as const };
      },
    },
  };
  assert.deepEqual(
    await signInWithNativeGoogle(origin, "public-key", destination, deps),
    { error: null },
  );
  await signInWithNativeGoogle(origin, "public-key", destination, deps);
  assert.equal(sheets, 2);
});

test("dos taps comparten una sola hoja; fallar el intercambio conserva la sesión", async (t) => {
  let finish!: (result: { cancelled: false; url: string }) => void;
  let sheets = 0;
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { error: "invalid_grant", error_description: "Code expired" },
      { status: 400 },
    ),
  );
  const destination = {
    setSession: async () => assert.fail("must not sign in"),
  } as Destination;
  const deps = {
    sheet: {
      authenticate: async () => {
        sheets++;
        return new Promise<{ cancelled: false; url: string }>((resolve) => {
          finish = resolve;
        });
      },
    },
  };
  const first = signInWithNativeGoogle(origin, "public-key", destination, deps);
  const second = signInWithNativeGoogle(
    origin,
    "public-key",
    destination,
    deps,
  );
  assert.equal(first, second);
  while (!finish) await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(sheets, 1);
  const rejection = assert.rejects(first, /Code expired/);
  finish({ cancelled: false, url: NATIVE_GOOGLE_CALLBACK + "?code=expired" });
  await rejection;
  await signInWithNativeGoogle(origin, "public-key", destination, {
    sheet: { authenticate: async () => ({ cancelled: true }) },
  });
});

test("no abre una autorización ajena y libera el cliente temporal tras fallar", async () => {
  let disposed = 0;
  const destination = {
    setSession: async () => assert.fail("must not sign in"),
  } as Destination;
  const createAuth: NativeGoogleDependencies["createAuth"] = () => ({
    signInWithOAuth: async () => ({
      data: { provider: "google", url: "https://evil.example/auth/v1/authorize" },
      error: null,
    }),
    exchangeCodeForSession: async () => assert.fail("must not exchange"),
    dispose: async () => {
      disposed++;
    },
  });
  await assert.rejects(
    signInWithNativeGoogle(origin, "public-key", destination, {
      createAuth,
      sheet: { authenticate: async () => assert.fail("must not open") },
    }),
    /acceso seguro/,
  );
  assert.equal(disposed, 1);
});
