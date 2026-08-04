/**
 * Optimises product/artist photos for the web.
 *
 * Reads the full-resolution originals from `source-assets/` (git-ignored) and
 * writes resized, recompressed copies into `public/`. next/image then serves
 * WebP/AVIF variants on top of these — but keeping the source files small
 * makes the optimiser faster and the mobile payload far lighter.
 *
 * Run:  npm run optimize:images
 * Idempotent — always reads the untouched originals, never re-compresses.
 */
import sharp from "sharp";
import path from "node:path";

const root = process.cwd();
const p = (...parts) => path.join(root, ...parts);

const photos = [
  {
    src: "source-assets/regenerated/font.jpeg",
    out: "public/front.webp",
    width: 1400,
    quality: 80,
  },
  {
    src: "source-assets/regenerated/back.jpeg",
    out: "public/back.webp",
    width: 1400,
    quality: 80,
  },
  {
    src: "source-assets/regenerated/artist-front.jpeg",
    out: "public/artist-front.webp",
    width: 1400,
    quality: 80,
  },
  {
    src: "source-assets/regenerated/artist-back.jpeg",
    out: "public/artist-back.webp",
    width: 1400,
    quality: 80,
  },
];

let total = 0;

for (const { src, out, width, quality } of photos) {
  const info = await sharp(p(src))
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toFile(p(out));
  total += info.size;
  console.log(
    `${out.padEnd(26)} ${info.width}w  ${(info.size / 1024).toFixed(0)} KB`,
  );
}

/**
 * Педаль «Димна Суміш». Оригінали — 10-12 МБ кожен, у public/ їм не місце.
 * Ширина 1400 — та сама, що й для решти фото товару.
 */
const pedalPhotos = [
  { src: "source-assets/pedal/pedal-front.png", out: "public/pedal-front.webp" },
  { src: "source-assets/pedal/pedal-angle.png", out: "public/pedal-angle.webp" },
  { src: "source-assets/pedal/pedal-kit.png", out: "public/pedal-kit.webp" },
];

for (const { src, out } of pedalPhotos) {
  const info = await sharp(p(src))
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(p(out));
  total += info.size;
  console.log(`${out.padEnd(26)} ${info.width}w  ${(info.size / 1024).toFixed(0)} KB`);
}

// JPEG-двійник фронтального фото: OpenGraph і JSON-LD читають деякі
// скрапери, що не розуміють webp.
const pedalOg = await sharp(p("source-assets/pedal/pedal-front.png"))
  .resize({ width: 1200, withoutEnlargement: true })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(p("public/pedal-front.jpg"));
total += pedalOg.size;
console.log(`${"public/pedal-front.jpg".padEnd(26)} ${pedalOg.width}w  ${(pedalOg.size / 1024).toFixed(0)} KB`);

// Logo — recoloured at runtime via CSS filter; just needs to be small.
const logo = await sharp(p("source-assets/logo.png"))
  .resize({ height: 140, withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(p("public/logo.png"));
total += logo.size;
console.log(
  `${"public/logo.png".padEnd(26)} ${logo.height}h  ${(logo.size / 1024).toFixed(0)} KB`,
);

console.log(`\nTotal: ${(total / 1024 / 1024).toFixed(2)} MB`);
