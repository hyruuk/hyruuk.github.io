#!/usr/bin/env node
/**
 * Build the responsive "world" artwork files from the master image.
 *
 *   npm run world                         # rebuild tiers from assets-src/world/world-master.webp
 *   npm run world -- --import big.png     # import a new (upscaled) master first, then rebuild
 *
 * Writes content-hashed files to public/world/ and a manifest to src/data/world.assets.json.
 * The master may be any size as long as it keeps the aspect ratio of the world units
 * (1210 x 900): the regions and cameras are expressed in those units, not in pixels.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('../../', import.meta.url).pathname;
const MASTER = join(ROOT, 'assets-src/world/world-master.webp');
const OUT_DIR = join(ROOT, 'public/world');
const MANIFEST = join(ROOT, 'src/data/world.assets.json');
const UNITS = [1210, 900];
const WIDTHS = [1210, 1815, 2420, 3630, 4840];

const args = process.argv.slice(2);
const importIdx = args.indexOf('--import');
if (importIdx !== -1) {
  const src = args[importIdx + 1];
  if (!src || !existsSync(src)) throw new Error(`--import needs an existing image path (got ${src})`);
  const meta = await sharp(src).metadata();
  const ratio = meta.width / meta.height;
  if (Math.abs(ratio - UNITS[0] / UNITS[1]) > 0.01) {
    throw new Error(`Master aspect ratio ${ratio.toFixed(4)} != world ${UNITS[0]}x${UNITS[1]}. Crop it first.`);
  }
  await sharp(src).webp({ quality: 92, effort: 6 }).toFile(MASTER);
  console.log(`imported ${src} (${meta.width}x${meta.height}) → ${MASTER}`);
}

if (!existsSync(MASTER)) throw new Error(`Missing ${MASTER}. Run with --import <image> first.`);
const masterBuf = readFileSync(MASTER);
const hash = createHash('sha256').update(masterBuf).digest('hex').slice(0, 8);
const { width: mw, height: mh } = await sharp(masterBuf).metadata();

mkdirSync(OUT_DIR, { recursive: true });
for (const f of readdirSync(OUT_DIR)) if (f.startsWith('world-')) rmSync(join(OUT_DIR, f));

const tiers = [];
for (const w of WIDTHS.filter((w) => w <= mw)) {
  const h = Math.round((w * mh) / mw);
  const base = `world-${hash}-${w}`;
  const resized = sharp(masterBuf).resize(w, h, { kernel: 'lanczos3' });
  // 4:4:4 chroma keeps the thin neon lines crisp; dark gradients are protected by the grain overlay
  await resized.clone().avif({ quality: 58, effort: 5, chromaSubsampling: '4:4:4' }).toFile(join(OUT_DIR, `${base}.avif`));
  await resized.clone().webp({ quality: 84, effort: 5 }).toFile(join(OUT_DIR, `${base}.webp`));
  tiers.push({ w, h, avif: `/world/${base}.avif`, webp: `/world/${base}.webp` });
  console.log(`tier ${w}x${h}`);
}

// Pre-blurred backdrop (pages with the "backdrop" look crossfade to it instead of animating a CSS blur)
const blurName = `world-${hash}-blur.webp`;
await sharp(masterBuf).resize(640).blur(9).modulate({ saturation: 1.1 }).webp({ quality: 70 }).toFile(join(OUT_DIR, blurName));

// Tiny placeholder painted before the real image decodes
const lqip = await sharp(masterBuf).resize(48).blur(1.2).webp({ quality: 50 }).toBuffer();

const manifest = {
  hash,
  units: UNITS,
  master: [mw, mh],
  tiers,
  blur: `/world/${blurName}`,
  lqip: `data:image/webp;base64,${lqip.toString('base64')}`,
};
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${MANIFEST} (hash ${hash}, ${tiers.length} tiers)`);
