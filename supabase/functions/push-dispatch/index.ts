import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { appleJWT, pushPayload } from "../_shared/apple-services.ts";

function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error("Service not configured");
  return value;
}
Deno.serve(async (request) => {
  const secret = Deno.env.get("PUSH_DISPATCH_SECRET");
  if (
    !secret ||
    secret.length < 32 ||
    request.method !== "POST" ||
    request.headers.get("authorization") !== `Bearer ${secret}`
  )
    return new Response("Unauthorized", { status: 401 });
  try {
    const topic = required("APNS_BUNDLE_ID");
    const now = Math.floor(Date.now() / 1000);
    const jwt = await appleJWT(
      required("APNS_PRIVATE_KEY"),
      required("APNS_KEY_ID"),
      { iss: required("APPLE_TEAM_ID"), iat: now },
    );
    const db = createClient(
      required("SUPABASE_URL"),
      required("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const claimed = await db.rpc("claim_native_push");
    if (claimed.error) throw new Error("Queue unavailable");
    type Delivery = {
      delivery_id: string;
      device_id: string;
      device_token: string;
      apns_environment: string;
      category: string;
      badge_count: number;
    };
    const rows = (claimed.data || []) as Delivery[];
    let delivered = 0;
    for (let offset = 0; offset < rows.length; offset += 5) {
      await Promise.all(
        rows.slice(offset, offset + 5).map(async (row) => {
          const host =
            row.apns_environment === "production"
              ? "https://api.push.apple.com"
              : "https://api.sandbox.push.apple.com";
          try {
            const response = await fetch(
              `${host}/3/device/${encodeURIComponent(row.device_token)}`,
              {
                method: "POST",
                signal: AbortSignal.timeout(10000),
                headers: {
                  authorization: `bearer ${jwt}`,
                  "apns-topic": topic,
                  "apns-push-type": "alert",
                  "apns-priority": "10",
                  "apns-expiration": String(now + 3600),
                  "apns-collapse-id": row.delivery_id,
                  "content-type": "application/json",
                },
                body: JSON.stringify(
                  pushPayload(row.category, row.badge_count),
                ),
              },
            );
            if (response.ok) {
              const saved = await db
                .from("native_push_outbox")
                .update({ delivered_at: new Date().toISOString() })
                .eq("id", row.delivery_id);
              if (!saved.error) delivered++;
            } else if (response.status === 410) {
              await db
                .from("native_push_devices")
                .delete()
                .eq("installation_id", row.device_id)
                .eq("token", row.device_token);
            }
            // Transient failures are retried by the lease with a five-attempt cap.
          } catch {
            /* Keep the leased row for a later attempt. Never log tokens. */
          }
        }),
      );
    }
    await db
      .from("native_push_outbox")
      .delete()
      .lt("available_at", new Date(Date.now() - 7 * 86400000).toISOString());
    return Response.json({ delivered });
  } catch {
    return Response.json(
      { error: "Push service unavailable" },
      { status: 503 },
    );
  }
});
