import type { SupabaseClient } from "@supabase/supabase-js";

/** Uploads a finished story photo and publishes it, following the same steps
 * as the original composer: upload to the private bucket, publish through
 * the `publish_story` RPC, and clean up the photo if publishing failed. */
export async function publishStoryPhoto({
  client,
  userId,
  photo,
  caption,
  audience,
}: {
  client: SupabaseClient;
  userId: string;
  photo: Blob;
  caption: string;
  audience: "members" | "friends";
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (caption.trim().length > 180)
    return {
      ok: false,
      message:
        "Tu texto es demasiado largo. Usa hasta 180 caracteres en total.",
    };
  const id = crypto.randomUUID();
  const path = `${userId}/${id}.jpg`;
  let uploaded = false;
  try {
    const upload = await client.storage
      .from("story-images")
      .upload(path, photo, {
        contentType: "image/jpeg",
        cacheControl: "0",
        upsert: false,
      });
    if (upload.error) throw upload.error;
    uploaded = true;
    const published = await client.rpc("publish_story", {
      story: id,
      story_caption: caption.trim(),
      story_audience: audience,
    });
    if (published.error) throw published.error;
    return { ok: true };
  } catch (e) {
    // A lost response can arrive after the commit: check before deleting.
    if (uploaded) {
      const check = await client.from("stories").select("id").eq("id", id);
      if (!check.error && check.data?.length) return { ok: true };
      if (!check.error)
        await client.storage.from("story-images").remove([path]);
    }
    return {
      ok: false,
      message:
        (e as { message?: string }).message ||
        "No pudimos publicar. Revisa tu conexión e inténtalo de nuevo.",
    };
  }
}
