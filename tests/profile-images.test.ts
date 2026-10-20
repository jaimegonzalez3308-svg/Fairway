import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createClient } from "@supabase/supabase-js";
import { demoMe } from "../lib/demo";
import { ProfilePhotoEditor } from "../components/profile-photo";
import {
  imageDimensions,
  prepareProfileImage,
  profileImageError,
  resolveProfilePhoto,
  saveProfilePhoto,
  PROFILE_PHOTO_REFRESH_MS,
} from "../lib/profile-images";

const userId = "00000000-0000-4000-8000-000000000001";
const file = () =>
  new File([new Uint8Array([255, 216, 255, 217])], "prepared.jpg", {
    type: "image/jpeg",
  });
function client(fetch: typeof globalThis.fetch) {
  return createClient("https://test.supabase.co", "test-key", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { fetch },
  });
}
function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
test("sube una ruta propia única y actualiza solamente la foto, sin exigir disponibilidad o modificar la bio", async () => {
  const requests: string[] = [];
  let path = "";
  const api = client(async (input, init) => {
    const url = new URL(String(input));
    requests.push(url.pathname);
    if (url.pathname.startsWith("/storage/v1/object/profile-images/")) {
      assert.equal(init?.method, "POST");
      path = url.pathname.replace("/storage/v1/object/profile-images/", "");
      assert.match(path, new RegExp(`^${userId}/[a-f0-9-]+\\.jpg$`));
      assert.ok(init?.body instanceof FormData);
      assert.equal((init.body.get("") as File).type, "image/jpeg");
      return response({ Key: `profile-images/${path}` });
    }
    if (url.pathname === "/rest/v1/profiles") {
      assert.equal(init?.method, "PATCH");
      assert.equal(url.searchParams.get("id"), `eq.${userId}`);
      assert.equal(url.searchParams.get("select"), "id,photo");
      assert.deepEqual(JSON.parse(String(init.body)), { photo: path });
      return response({ id: userId, photo: path });
    }
    assert.equal(
      url.pathname,
      `/storage/v1/object/sign/profile-images/${path}`,
    );
    assert.equal(JSON.parse(String(init?.body)).expiresIn, 3600);
    return response({
      signedURL: `/object/sign/profile-images/${path}?token=test`,
    });
  });
  const saved = await saveProfilePhoto(api, userId, file());
  assert.equal(requests.length, 3);
  assert.equal(saved.photo_path, path);
  assert.match(
    saved.photo,
    /https:\/\/test.supabase.co\/storage\/v1\/object\/sign/,
  );
});
test("un error de subida no escribe el perfil ni presenta éxito", async () => {
  let requests = 0;
  const api = client(async () => {
    requests++;
    return response(
      {
        statusCode: "403",
        error: "Unauthorized",
        message: "new row violates row-level security policy",
      },
      403,
    );
  });
  await assert.rejects(
    saveProfilePhoto(api, userId, file()),
    /row-level security/,
  );
  assert.equal(requests, 1);
});
test("un UPDATE sin filas visibles no se considera guardado", async () => {
  let requests = 0;
  const api = client(async (input) => {
    requests++;
    if (String(input).includes("/rest/v1/profiles"))
      return response(
        {
          code: "PGRST116",
          message: "JSON object requested, multiple (or no) rows returned",
        },
        406,
      );
    return response({ Key: "uploaded" });
  });
  await assert.rejects(
    saveProfilePhoto(api, userId, file()),
    (error) => (error as { code: string }).code === "PGRST116",
  );
  assert.equal(requests, 2);
});
test("quitar la foto cambia solo su referencia sin subir ni borrar archivos anteriores", async () => {
  let requests = 0;
  const api = client(async (input, init) => {
    requests++;
    assert.match(String(input), /\/rest\/v1\/profiles/);
    assert.equal(init?.method, "PATCH");
    assert.deepEqual(JSON.parse(String(init?.body)), { photo: "" });
    return response({ id: userId, photo: "" });
  });
  const saved = await saveProfilePhoto(api, userId, null);
  assert.equal(saved.photo, "");
  assert.equal(requests, 1);
});
test("un fallo al firmar conserva la ruta para reintentar; renovar nunca guarda la URL temporal en la base", async () => {
  const path = `${userId}/existing.jpg`;
  const failed = await resolveProfilePhoto(
    client(async () =>
      response(
        { message: "Object not found", statusCode: "404", error: "not_found" },
        404,
      ),
    ),
    { ...demoMe, photo: path },
  );
  assert.equal(failed.photo, "");
  assert.equal(failed.photo_path, path);
  let requests = 0;
  const renewed = await resolveProfilePhoto(
    client(async (input) => {
      requests++;
      assert.equal(
        new URL(String(input)).pathname,
        `/storage/v1/object/sign/profile-images/${path}`,
      );
      return response({
        signedURL: `/object/sign/profile-images/${path}?token=renewed`,
      });
    }),
    { ...failed, photo: "https://test.supabase.co/expired?token=old" },
  );
  assert.equal(requests, 1);
  assert.match(renewed.photo, /token=renewed/);
  assert.equal(renewed.photo_path, path);
  assert.ok(PROFILE_PHOTO_REFRESH_MS < 3600 * 1000);
});
test("reduce fotos de cámara conservando proporción y no amplía imágenes pequeñas", () => {
  assert.deepEqual(imageDimensions(4032, 3024), { width: 1024, height: 768 });
  assert.deepEqual(imageDimensions(3024, 4032), { width: 768, height: 1024 });
  assert.deepEqual(imageDimensions(320, 240), { width: 320, height: 240 });
  assert.throws(() => imageDimensions(0, 240));
});
test("rechaza archivos vacíos, tipos no compatibles y archivos excesivos antes de usar el navegador", async () => {
  await assert.rejects(
    prepareProfileImage(new File([], "empty.jpg", { type: "image/jpeg" })),
    /vacía/,
  );
  await assert.rejects(
    prepareProfileImage(new File(["text"], "file.txt", { type: "text/plain" })),
    /JPG/,
  );
  await assert.rejects(
    prepareProfileImage(
      new File([new Uint8Array(31 * 1024 * 1024)], "large.jpg", {
        type: "image/jpeg",
      }),
    ),
    /30 MB/,
  );
  assert.match(profileImageError(new TypeError("Failed to fetch")), /conexión/);
  assert.match(
    profileImageError({ statusCode: "403", message: "denied" }),
    /sesión/,
  );
});
test("el editor identifica la foto actual, requiere elegir un cambio y ofrece guardar o cancelar", () => {
  const html = renderToStaticMarkup(
    createElement(ProfilePhotoEditor, {
      currentPhoto: "/images/avatar.svg",
      hasPhoto: true,
      async onSave() {},
      onDone() {},
    }),
  );
  assert.match(html, /Foto de perfil actual/);
  assert.match(html, /type="file"/);
  assert.match(html, /disabled="">Guardar foto/);
  assert.match(html, /Quitar mi foto de perfil/);
  assert.match(html, /Cancelar/);
});
