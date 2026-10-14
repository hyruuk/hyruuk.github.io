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
const only = args.find((a) => a.startsWith('--only='))?.slice(7); // e.g. --only=aura (keep the existing tiers)
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

/**
 * The "aura": a blurred, mirrored extension of the artwork with soft transparent edges. It sits
 * behind the art (2.5× its size) so the picture seems to continue and slowly dissolve into an
 * infinite universe instead of ending at a frame. Two blur levels: close to the art the extension
 * is only slightly out of focus, further away it melts into colour fields, then into the void.
 */
async function buildAura() {
  const AW = 600;
  const AH = Math.round((AW * mh) / mw);
  const padX = Math.round(AW * 0.75);
  const padY = Math.round(AH * 0.75);
  const W2 = AW + 2 * padX;
  const H2 = AH + 2 * padY;
  const core = await sharp(masterBuf).resize(AW, AH).toBuffer();
  const extended = await sharp(core)
    .extend({ top: padY, bottom: padY, left: padX, right: padX, extendWith: 'mirror' })
    .toBuffer();
  const far = await sharp(extended).blur(42).modulate({ saturation: 1.3, brightness: 0.85 }).toBuffer();
  const near = await sharp(extended).blur(11).modulate({ saturation: 1.15, brightness: 0.95 }).raw().toBuffer({ resolveWithObject: true });
  // the near (sharper) layer only lives in a soft band around the art
  const nearMask = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}"><defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Math.round(AW * 0.07)}"/></filter></defs><rect width="100%" height="100%" fill="#000"/><rect x="${padX - AW * 0.06}" y="${padY - AH * 0.06}" width="${AW * 1.12}" height="${AH * 1.12}" rx="${AW * 0.08}" fill="#fff" filter="url(#b)"/></svg>`,
    ),
  )
    .resize(W2, H2)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const nearRgba = await sharp(near.data, { raw: near.info })
    .removeAlpha()
    .joinChannel(nearMask, { raw: { width: W2, height: H2, channels: 1 } })
    .png()
    .toBuffer();
  const layered = await sharp(far).composite([{ input: nearRgba }]).toBuffer();
  // elliptical alpha: opaque around the art, fading to nothing far away
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}"><defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".45" stop-color="#fff" stop-opacity=".9"/><stop offset=".72" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  );
  const name = `world-${hash}-aura.webp`;
  await sharp(layered)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .webp({ quality: 74, alphaQuality: 80, effort: 6 })
    .toFile(join(OUT_DIR, name));
  return `/world/${name}`;
}

if (only === 'aura') {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  for (const f of readdirSync(OUT_DIR)) if (f.endsWith('-aura.webp')) rmSync(join(OUT_DIR, f));
  manifest.aura = await buildAura();
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`aura → ${manifest.aura}`);
  process.exit(0);
}

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
  aura: await buildAura(),
  lqip: `data:image/webp;base64,${lqip.toString('base64')}`,
};
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${MANIFEST} (hash ${hash}, ${tiers.length} tiers)`);
