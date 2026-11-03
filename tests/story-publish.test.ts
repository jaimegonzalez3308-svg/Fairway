import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { publishStoryPhoto } from "../lib/story-publish";
import { overlayCaption } from "../lib/stories";

function backend(mode: "success" | "rejected" | "committed" | "uncertain") {
  const calls: string[] = [];
  let publishedId = "";
  let caption = "";
  const response = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  const client = createClient("https://stories-test.invalid", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname.includes("/rest/v1/rpc/publish_story")) {
          calls.push("publish");
          const body = JSON.parse(String(init?.body));
          publishedId = body.story;
          caption = body.story_caption;
          return mode === "success"
            ? response(publishedId)
            : response({ message: "Texto bloqueado", code: "P0001" }, 400);
        }
        if (url.pathname === "/rest/v1/stories") {
          calls.push("verify");
          if (mode === "uncertain")
            return response({ message: "Offline" }, 503);
          return response(mode === "committed" ? [{ id: publishedId }] : []);
        }
        if (init?.method === "DELETE") {
          calls.push("remove");
          return response([]);
        }
        calls.push("upload");
        assert.match(
          url.pathname,
          /^\/storage\/v1\/object\/story-images\/viewer\//,
        );
        return response({ Key: "story-images/photo.jpg" });
      },
    },
  });
  return {
    calls,
    caption: () => caption,
    publish: (text = overlayCaption(["Buen golf", "Mejor compañía"])) =>
      publishStoryPhoto({
        client,
        userId: "viewer",
        photo: new Blob(["fictional image"], { type: "image/jpeg" }),
        caption: text,
        audience: "friends",
      }),
  };
}

test("typed overlays reach the existing moderated story caption unchanged", async () => {
  const api = backend("success");
  assert.deepEqual(await api.publish(), { ok: true });
  assert.equal(api.caption(), overlayCaption(["Buen golf", "Mejor compañía"]));
  assert.deepEqual(api.calls, ["upload", "publish"]);
});

test("rejected publication keeps the server error and removes the unpublished image", async () => {
  const api = backend("rejected");
  assert.deepEqual(await api.publish(), {
    ok: false,
    message: "Texto bloqueado",
  });
  assert.deepEqual(api.calls, ["upload", "publish", "verify", "remove"]);
});

test("an already committed story is retained after an ambiguous publish response", async () => {
  const api = backend("committed");
  assert.deepEqual(await api.publish(), { ok: true });
  assert.deepEqual(api.calls, ["upload", "publish", "verify"]);
});

test("an uncertain verification never deletes an image that may have been published", async () => {
  const api = backend("uncertain");
  assert.equal((await api.publish()).ok, false);
  assert.deepEqual(api.calls.slice(0, 2), ["upload", "publish"]);
  assert.ok(api.calls.slice(2).length > 0);
  assert.ok(api.calls.slice(2).every((call) => call === "verify"));
});

test("overlong overlay text fails before uploading or calling the backend", async () => {
  const api = backend("success");
  assert.equal(
    (await api.publish(overlayCaption(["a".repeat(180)]))).ok,
    false,
  );
  assert.deepEqual(api.calls, []);
});
