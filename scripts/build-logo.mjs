/**
 * Prepares the supplied brand mark for the web.
 *
 * The logo arrives as a large photographic export on an opaque background.
 * This lifts it off that background, trims the margins, and writes the sizes
 * the site and the browser chrome need. The artwork itself is never altered —
 * no recolouring, no redrawing, only matting and scaling.
 *
 *   npm run logo
 *
 * Input   src/assets/brand/logo-source.<ext>   (the original, kept verbatim)
 * Output  src/assets/brand/logo.webp           (used by Logo.astro)
 *         public/favicon-mark.png              (browser tab, 32px)
 *         public/apple-touch-icon.png          (home screen, 180px)
 *
 * If the replacement logo is already an SVG or a transparent PNG, this script
 * is unnecessary: drop it in as `src/assets/brand/logo.svg` (or `.png`) and
 * `Logo.astro` picks it up at build time.
 */

import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Colour distance at which a pixel stops being background and starts being
 *  artwork. The ramp between them is what keeps the edge anti-aliased. */
const FULLY_BACKGROUND = 26;
const FULLY_ARTWORK = 52;

const BRAND_DIR = 'src/assets/brand';
const source = (await readdir(BRAND_DIR)).find((f) => /^logo-source\.(jpe?g|png|webp|tiff?)$/i.test(f));

if (!source) {
  console.error(`No logo-source.* found in ${BRAND_DIR}/ — nothing to do.`);
  process.exit(1);
}

const src = join(BRAND_DIR, source);
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

// The background colour, averaged over a band of border pixels rather than a
// few corners — the export has a soft vignette, so one corner is not enough.
let r = 0, g = 0, b = 0, samples = 0;
for (let x = 0; x < width; x += 4) {
  for (const y of [0, 1, 2, height - 3, height - 2, height - 1]) {
    const i = (y * width + x) * channels;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    samples += 1;
  }
}
const background = [r / samples, g / samples, b / samples];

const matted = Buffer.alloc(width * height * 4);
let opaque = 0;

for (let p = 0; p < width * height; p += 1) {
  const s = p * channels;
  const d = p * 4;
  const distance = Math.max(
    Math.abs(data[s] - background[0]),
    Math.abs(data[s + 1] - background[1]),
    Math.abs(data[s + 2] - background[2]),
  );
  const t = Math.min(1, Math.max(0, (distance - FULLY_BACKGROUND) / (FULLY_ARTWORK - FULLY_BACKGROUND)));
  const alpha = Math.round(t * t * (3 - 2 * t) * 255); // smoothstep, for a soft edge

  matted[d] = data[s];
  matted[d + 1] = data[s + 1];
  matted[d + 2] = data[s + 2];
  matted[d + 3] = alpha;
  if (alpha > 200) opaque += 1;
}

const cut = await sharp(matted, { raw: { width, height, channels: 4 } })
  .png()
  .trim({ threshold: 1 })
  .toBuffer();

const trimmed = await sharp(cut).metadata();

await mkdir('public', { recursive: true });

// 256 covers a 40 px mark on a 3× display with room to spare; anything larger
// is bytes the page never uses.
await sharp(cut).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .webp({ quality: 88, effort: 6 })
  .toFile(join(BRAND_DIR, 'logo.webp'));

await sharp(cut).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('public/favicon-mark.png');

// Apple wants an opaque icon; give it the site's own black rather than white.
await sharp(cut).resize(152, 152, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: 14, bottom: 14, left: 14, right: 14, background: '#050505' })
  .flatten({ background: '#050505' })
  .png()
  .toFile('public/apple-touch-icon.png');

console.log(`source     ${src} (${width}×${height})`);
console.log(`background ${background.map(Math.round).join(', ')} · ${(opaque / (width * height) * 100).toFixed(1)}% opaque after matting`);
console.log(`trimmed    ${trimmed.width}×${trimmed.height}`);
console.log('wrote      src/assets/brand/logo.webp, public/favicon-mark.png, public/apple-touch-icon.png');
