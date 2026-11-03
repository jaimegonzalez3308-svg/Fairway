const encoder = new TextEncoder();
function base64url(value: Uint8Array) {
  return btoa(String.fromCharCode(...value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
export async function appleJWT(
  key: string,
  keyId: string,
  claims: Record<string, unknown>,
) {
  const body = key.replaceAll("\\n", "\n").replace(/-----[^-]+-----|\s/g, "");
  const bytes = Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    bytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = base64url(
    encoder.encode(JSON.stringify({ alg: "ES256", kid: keyId })),
  );
  const payload = base64url(encoder.encode(JSON.stringify(claims)));
  const input = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(input),
  );
  return `${input}.${base64url(new Uint8Array(signature))}`;
}
// Only use for an id_token returned directly by Apple's HTTPS /auth/token
// endpoint after it validates our client secret and a fresh authorization code.
function decode(value: string) {
  const decoded = value.replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(
    atob(decoded.padEnd(Math.ceil(decoded.length / 4) * 4, "=")),
    (char) => char.charCodeAt(0),
  );
}
export async function verifyAppleToken(
  token: string,
  expected: { subject: string; clientId: string; nonce: string; now: number },
  suppliedKeys?: (JsonWebKey & { kid?: string })[],
) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid Apple token");
  const header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
  if (header.alg !== "RS256" || typeof header.kid !== "string")
    throw new Error("Invalid Apple signing algorithm");
  const keys =
    suppliedKeys ||
    (await fetch("https://appleid.apple.com/auth/keys", {
      signal: AbortSignal.timeout(10000),
    }).then(async (response) => {
      if (!response.ok) throw new Error("Apple signing keys unavailable");
      return (await response.json()).keys as (JsonWebKey & { kid?: string })[];
    }));
  if (!Array.isArray(keys)) throw new Error("Apple signing keys unavailable");
  const jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) throw new Error("Unknown Apple signing key");
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  if (
    !(await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decode(parts[2]),
      encoder.encode(parts[0] + "." + parts[1]),
    ))
  )
    throw new Error("Invalid Apple signature");
  const claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (
    claims.iss !== "https://appleid.apple.com" ||
    claims.sub !== expected.subject ||
    !audiences.includes(expected.clientId) ||
    typeof claims.exp !== "number" ||
    claims.exp < expected.now ||
    typeof claims.iat !== "number" ||
    claims.iat < expected.now - 600 ||
    claims.iat > expected.now + 60 ||
    claims.nonce !== (await nonceHash(expected.nonce))
  )
    throw new Error("Apple identity mismatch");
  return claims;
}
export async function nonceHash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
export function pushRoute(category: string) {
  const pages: Record<string, string> = {
    messages: "mensajes",
    games: "partidas",
    friends: "amigos",
    matches: "amigos",
    community: "comunidad",
    reviews: "perfil",
  };
  return `com.fairway.app://open?screen=${pages[category] || "descubrir"}`;
}
export function pushPayload(category: string, badgeCount = 0) {
  return {
    aps: {
      badge: Math.max(
        0,
        Math.min(999, Math.trunc(Number.isFinite(badgeCount) ? badgeCount : 0)),
      ),
      alert: {
        title: "Fairway",
        body: "Hay una actualización para ti. Abre Fairway para verla.",
      },
      sound: "default",
    },
    url: pushRoute(category),
  };
}
