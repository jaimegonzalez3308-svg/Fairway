/** Run with installed Next dependencies. Keep the source outside the exported public directory. */
import { createRequire } from "node:module";
import { stat } from "node:fs/promises";
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const source = "docs/assets/fairway-aerial-source.webp";
for (const width of [640, 1024, 1600]) {
  const name = width === 1600 ? "fairway-aerial" : `fairway-aerial-${width}`;
  for (const format of ["webp", "avif"]) {
    const target = `public/images/${name}.${format}`;
    let image = sharp(source).resize({ width, withoutEnlargement: true });
    image =
      format === "avif"
        ? image.avif({ quality: 55, effort: 5 })
        : image.webp({ quality: 80, effort: 5 });
    await image.toFile(target);
    console.log(`${target}: ${(await stat(target)).size} bytes`);
  }
}
