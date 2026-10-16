import { test } from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import jsQR from "jsqr";
import {
  profileShareUrl,
  sharedProfileId,
  nameSearchPattern,
} from "../lib/profile-share";
const id = "b1efb86c-4e02-4ad5-b942-0c4c7b48ebcb";
test("enlace de perfil estable, sin tokens ni parámetros de autenticación", () => {
  const url = profileShareUrl(
    "https://fairway-leon-golf.honeyring4.chatgpt.site/?access_token=privado#perfil",
    id,
  );
  assert.equal(
    url,
    `https://fairway-leon-golf.honeyring4.chatgpt.site/?golfista=${id}#amigos`,
  );
  assert.equal(sharedProfileId(new URL(url).search), id);
  for (const s of [
    "?golfista=no-es-id",
    "?golfista=javascript:alert(1)",
    "?golfista=",
    "?access_token=secret",
  ])
    assert.equal(sharedProfileId(s), null);
  assert.throws(() => profileShareUrl("https://example.com", "fake-user"));
});
test("el QR es legible y contiene el enlace exacto del perfil", () => {
  const url = profileShareUrl(
    "https://fairway-leon-golf.honeyring4.chatgpt.site",
    id,
  );
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" }),
    scale = 6,
    margin = 4;
  const side = (qr.modules.size + margin * 2) * scale;
  const pixels = new Uint8ClampedArray(side * side * 4);
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++) {
      const row = Math.floor(y / scale) - margin,
        col = Math.floor(x / scale) - margin;
      const dark =
        row >= 0 &&
        col >= 0 &&
        row < qr.modules.size &&
        col < qr.modules.size &&
        qr.modules.get(row, col);
      const offset = (y * side + x) * 4;
      pixels[offset] = dark ? 23 : 255;
      pixels[offset + 1] = dark ? 59 : 255;
      pixels[offset + 2] = dark ? 42 : 255;
      pixels[offset + 3] = 255;
    }
  assert.equal(jsQR(pixels, side, side)?.data, url);
});
test("búsqueda trata comodines y escapes como parte literal del nombre", () => {
  assert.equal(nameSearchPattern("  Ana  "), "%Ana%");
  assert.equal(nameSearchPattern("100%_club\\golf"), "%100\\%\\_club\\\\golf%");
});
