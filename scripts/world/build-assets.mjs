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

/** Small deterministic PRNG (mulberry32), as in src/lib/compose.ts. */
function seeded(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE = ['#42b1e6', '#009df1', '#8b8bf3', '#a978f1', '#ee649e', '#dc67e6', '#9fd8ff', '#5ad1c8'];

/**
 * Faint luminous "flux" lines that continue the artwork's lines into the void, as an SVG in world
 * units (the art is 0..1210 × 0..900), hidden over the painting and fading out far away.
 */
function fluxSvg([x0, y0, vw, vh], pxW, pxH) {
  const [W, H] = UNITS;
  const X0 = -1.5 * W;
  const VW = 4 * W;
  const Y0 = -1.5 * H;
  const VH = 4 * H;
  const rand = seeded('neural-odyssey-flux');
  const f = (n) => n.toFixed(1);
  const wave = () => {
    const base = Y0 + 250 + rand() * (VH - 500);
    const a = 30 + rand() * 170;
    const lambda = 450 + rand() * 1000;
    const phi = rand() * Math.PI * 2;
    const slope = (rand() - 0.5) * 0.3;
    const a2 = a * (0.2 + rand() * 0.4);
    const lambda2 = lambda * (0.3 + rand() * 0.3);
    const pts = [];
    for (let x = X0; x <= X0 + VW; x += 110) {
      pts.push([x, base + slope * (x - W / 2) + a * Math.sin((2 * Math.PI * x) / lambda + phi) + a2 * Math.sin((2 * Math.PI * x) / lambda2 + phi * 1.7)]);
    }
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let k = 0; k < pts.length - 1; k++) {
      const p0 = pts[Math.max(0, k - 1)];
      const p1 = pts[k];
      const p2 = pts[k + 1];
      const p3 = pts[Math.min(pts.length - 1, k + 2)];
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d;
  };
  const lines = Array.from({ length: 16 }, (_, i) => {
    const width = (0.9 + rand() * 1.1).toFixed(2);
    const opacity = (0.22 + rand() * 0.35).toFixed(2);
    return `<path d="${wave()}" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="${width}" stroke-opacity="${opacity}"/>`;
  }).join('');
  const motes = Array.from({ length: 90 }, () => {
    const x = (X0 + rand() * VW).toFixed(0);
    const y = (Y0 + rand() * VH).toFixed(0);
    const r = (0.8 + rand() * 1.6).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${PALETTE[Math.floor(rand() * PALETTE.length)]}" fill-opacity="${(0.25 + rand() * 0.5).toFixed(2)}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${vw} ${vh}" width="${pxW}" height="${pxH}"><defs><radialGradient id="r" gradientUnits="userSpaceOnUse" cx="${W / 2}" cy="${H / 2}" r="${1.9 * W}" gradientTransform="translate(${W / 2} ${H / 2}) scale(1 0.78) translate(${-W / 2} ${-H / 2})"><stop offset="0" stop-color="#000"/><stop offset=".2" stop-color="#000"/><stop offset=".3" stop-color="#fff"/><stop offset=".58" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#000"/></radialGradient><mask id="m" maskUnits="userSpaceOnUse" x="${x0}" y="${y0}" width="${vw}" height="${vh}"><rect x="${x0}" y="${y0}" width="${vw}" height="${vh}" fill="url(#r)"/></mask></defs><g mask="url(#m)" fill="none" stroke-linecap="round">${lines}${motes}</g></svg>`;
}

/**
 * The "aura": a blurred, mirrored extension of the artwork with soft transparent edges and the faint
 * flux lines baked in. It sits behind the art (2.5× its size) so the picture seems to continue and
 * slowly dissolve into an infinite universe instead of ending at a frame. Two blur levels: close to
 * the art the extension is only slightly out of focus, further away it melts into colour fields.
 * One plain image on purpose: it is cheap to move during camera flights (an SVG would be re-drawn
 * at every zoom step by some browsers).
 */
async function buildAura() {
  const AW = 1200;
  const AH = Math.round((AW * mh) / mw);
  const padX = Math.round(AW * 0.75);
  const padY = Math.round(AH * 0.75);
  const W2 = AW + 2 * padX;
  const H2 = AH + 2 * padY;
  const core = await sharp(masterBuf).resize(AW, AH).toBuffer();
  const extended = await sharp(core)
    .extend({ top: padY, bottom: padY, left: padX, right: padX, extendWith: 'mirror' })
    .toBuffer();
  const far = await sharp(extended).blur(84).modulate({ saturation: 1.3, brightness: 0.85 }).toBuffer();
  const near = await sharp(extended).blur(22).modulate({ saturation: 1.15, brightness: 0.95 }).raw().toBuffer({ resolveWithObject: true });
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
  const [W, H] = UNITS;
  const flux = Buffer.from(fluxSvg([-0.75 * W, -0.75 * H, 2.5 * W, 2.5 * H], W2, H2));
  const layered = await sharp(far).composite([{ input: nearRgba }, { input: flux }]).toBuffer();
  // elliptical alpha: opaque around the art, fading to nothing far away
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}"><defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".45" stop-color="#fff" stop-opacity=".9"/><stop offset=".72" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  );
  const name = `world-${hash}-aura.webp`;
  await sharp(layered)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .webp({ quality: 70, alphaQuality: 80, effort: 6 })
    .toFile(join(OUT_DIR, name));
  return `/world/${name}`;
}

/** Star tiles (repeated by CSS): plain images, cheap to move, unlike dozens of CSS gradients. */
async function buildStars() {
  const tile = async (name, seed, count, rMin, rMax, alphaMin) => {
    const rand = seeded(seed);
    const S = 1024;
    const colors = ['#ffffff', '#c8dcff', '#aabeff', '#ffd7f0', '#befffa'];
    let defs = '';
    let dots = '';
    for (let i = 0; i < count; i++) {
      const x = (rand() * S).toFixed(1);
      const y = (rand() * S).toFixed(1);
      const r = rMin + rand() * (rMax - rMin);
      const c = colors[Math.floor(rand() * colors.length)];
      const a = (alphaMin + rand() * (1 - alphaMin)).toFixed(2);
      defs += `<radialGradient id="g${i}"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/><stop offset=".45" stop-color="${c}" stop-opacity="${(a * 0.6).toFixed(2)}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
      dots += `<circle cx="${x}" cy="${y}" r="${(r * 2.2).toFixed(2)}" fill="url(#g${i})"/>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs>${defs}</defs>${dots}</svg>`;
    await sharp(Buffer.from(svg)).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(join(OUT_DIR, name));
    return `/world/${name}`;
  };
  return {
    stars: await tile('stars.webp', 'neural-odyssey-stars', 70, 0.6, 1.5, 0.45),
    twinkle: await tile('stars-twinkle.webp', 'neural-odyssey-twinkle', 14, 1.2, 2.1, 0.8),
  };
}

if (only === 'aura') {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  for (const f of readdirSync(OUT_DIR)) if (f.endsWith('-aura.webp')) rmSync(join(OUT_DIR, f));
  manifest.aura = await buildAura();
  Object.assign(manifest, await buildStars());
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`aura → ${manifest.aura}, stars → ${manifest.stars}`);
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const f of readdirSync(OUT_DIR)) if (f.startsWith('world-') || f.startsWith('stars')) rmSync(join(OUT_DIR, f));

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
  ...(await buildStars()),
  lqip: `data:image/webp;base64,${lqip.toString('base64')}`,
};
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${MANIFEST} (hash ${hash}, ${tiers.length} tiers)`);
