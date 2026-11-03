import { test } from "node:test";
import assert from "node:assert/strict";
import type {
  MediaResult,
  TakePhotoOptions,
  ChooseFromGalleryOptions,
} from "@capacitor/camera";
import {
  requestStoryPhoto,
  storyPhotoError,
  type StoryPhotoDependencies,
} from "../lib/native-story-photo";
import { profileShareUrl } from "../lib/profile-share";
import { gameShareUrl } from "../lib/game-share";
import { authRedirectUrl } from "../lib/auth";
import { site } from "../lib/site";
import { prepareStoryPhoto } from "../lib/stories";

function cameraFixture(
  overrides: Partial<StoryPhotoDependencies["camera"]> = {},
) {
  const calls: {
    camera?: TakePhotoOptions;
    photos?: ChooseFromGalleryOptions;
    reads: string[];
    permissions: number;
  } = { reads: [], permissions: 0 };
  const photo: MediaResult = {
    type: 0,
    uri: "file:///private/cache/story.jpeg",
    saved: false,
  };
  const deps: StoryPhotoDependencies = {
    camera: {
      async checkPermissions() {
        calls.permissions++;
        return { camera: "prompt", photos: "limited" };
      },
      async takePhoto(options) {
        calls.camera = options;
        return photo;
      },
      async chooseFromGallery(options) {
        calls.photos = options;
        return { results: [photo] };
      },
      ...overrides,
    },
    convertFileSrc: (path) =>
      "capacitor://localhost/_capacitor_file_/" + path.replace("file:///", ""),
    async read(url) {
      calls.reads.push(url);
      return {
        ok: true,
        async blob() {
          return new Blob(["draft"], { type: "image/jpeg" });
        },
      };
    },
  };
  return { deps, calls, photo };
}

test("camera returns a local draft without metadata, auto-saving or publishing", async () => {
  const { deps, calls } = cameraFixture();
  const file = await requestStoryPhoto("camera", deps);
  assert.equal(file?.type, "image/jpeg");
  assert.equal(await file?.text(), "draft");
  assert.equal(calls.permissions, 1);
  assert.equal(calls.camera?.saveToGallery, false);
  assert.equal(calls.camera?.includeMetadata, false);
  assert.equal(calls.camera?.targetWidth, 1600);
  assert.equal(calls.camera?.targetHeight, 1600);
  assert.equal(calls.camera?.correctOrientation, true);
  assert.equal(calls.photos, undefined);
  assert.deepEqual(calls.reads, [
    "capacitor://localhost/_capacitor_file_/private/cache/story.jpeg",
  ]);
});

test("photo selection accepts the system's limited picker and does not request full library access", async () => {
  const { deps, calls } = cameraFixture();
  assert.ok(await requestStoryPhoto("photos", deps));
  assert.equal(calls.permissions, 0);
  assert.equal(calls.photos?.allowMultipleSelection, false);
  assert.equal(calls.photos?.mediaType, 0);
  assert.equal(calls.photos?.includeMetadata, false);
  assert.equal(calls.camera, undefined);
});

test("cancellation and an empty selection return no draft and never read a photo", async () => {
  for (const message of [
    "User cancelled photos app",
    "The user canceled the camera.",
  ]) {
    const { deps, calls } = cameraFixture({
      async takePhoto() {
        throw new Error(message);
      },
    });
    assert.equal(await requestStoryPhoto("camera", deps), null);
    assert.deepEqual(calls.reads, []);
  }
  const { deps } = cameraFixture({
    async chooseFromGallery() {
      return { results: [] };
    },
  });
  assert.equal(await requestStoryPhoto("photos", deps), null);
});

test("denied permission, an unavailable simulator camera and unreadable photos give a usable fallback", async () => {
  const { deps, calls } = cameraFixture({
    async checkPermissions() {
      return { camera: "denied", photos: "granted" };
    },
  });
  await assert.rejects(requestStoryPhoto("camera", deps), /Ajustes del iPhone/);
  assert.equal(calls.camera, undefined);
  assert.deepEqual(calls.reads, []);
  assert.match(
    storyPhotoError(
      new Error("Camera not available while running in Simulator"),
    )!,
    /iPhone físico/,
  );
  deps.read = async () => ({ ok: false, blob: async () => new Blob() });
  await assert.rejects(requestStoryPhoto("photos", deps), /Intenta otra vez/);
});

test("native photo reads stay local and reject videos, empty images and oversize drafts", async () => {
  for (const photo of [
    { type: 1, uri: "file:///private/movie.mp4", saved: false },
    { type: 0, uri: "https://example.com/private.jpg", saved: false },
  ]) {
    const { deps, calls } = cameraFixture({
      async takePhoto() {
        return photo;
      },
    });
    await assert.rejects(
      requestStoryPhoto("camera", deps),
      /fotografía guardada/,
    );
    assert.deepEqual(calls.reads, []);
  }
  for (const size of [0, 10 * 1024 * 1024 + 1]) {
    const { deps } = cameraFixture();
    deps.read = async () => ({
      ok: true,
      blob: async () =>
        new Blob([new Uint8Array(size)], { type: "image/jpeg" }),
    });
    await assert.rejects(requestStoryPhoto("camera", deps), /10 MB/);
  }
  await assert.rejects(
    prepareStoryPhoto(new File([], "empty.jpg", { type: "image/jpeg" })),
    /vacía/,
  );
});

test("iOS profile, round and email links use the same public website and IDs without session tokens", () => {
  const id = "44444444-4444-4444-8444-444444444444";
  const origin = new URL(site.url).origin;
  for (const local of ["null", "capacitor://localhost"]) {
    assert.equal(
      profileShareUrl(local, id),
      `${origin}/?golfista=${id}#amigos`,
    );
    assert.equal(gameShareUrl(local, id), `${origin}/?partida=${id}#partidas`);
    assert.equal(
      authRedirectUrl(local, false, `?partida=${id}&access_token=secret`),
      `${origin}/?partida=${id}#partidas`,
    );
    assert.equal(authRedirectUrl(local, true), `${origin}/?recovery=1`);
  }
  assert.equal(
    gameShareUrl("https://example.com/?access_token=secret#secret", id),
    `https://example.com/?partida=${id}#partidas`,
  );
  assert.throws(() => profileShareUrl("javascript:alert(1)", id));
});
