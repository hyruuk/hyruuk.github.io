/**
 * Local Astro integration: after `astro build`, writes dist/world/places.json — where every page sits
 * in the world (its <html data-camera/data-stage/data-look>), read from the built pages themselves.
 * The camera controller uses it to start flying the moment a link is clicked, instead of waiting for
 * the next page to download (src/scripts/world/places.ts).
 *
 *   { "specs": [[camera, stage, look], …], "pages": { "/research/": 3, … } }
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (name === 'index.html') yield p;
  }
}

const decode = (s) =>
  s.replace(/&(quot|amp|lt|gt|#39|#x27);/g, (_, e) => ({ quot: '"', amp: '&', lt: '<', gt: '>', '#39': "'", '#x27': "'" })[e]);

export function buildPlacesMap(distDir) {
  const specs = [];
  const index = new Map();
  const pages = {};
  for (const file of walk(distDir)) {
    const tag = readFileSync(file, 'utf8').match(/<html\b[^>]*>/)?.[0];
    if (!tag) continue;
    const attr = (name) => {
      const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
      return m ? decode(m[1]) : undefined;
    };
    const camera = attr('data-camera');
    if (!camera) continue;
    const spec = [camera, attr('data-stage') ?? 'backdrop', attr('data-look') ?? 'full'];
    const key = JSON.stringify(spec);
    if (!index.has(key)) {
      index.set(key, specs.length);
      specs.push(spec);
    }
    const dir = relative(distDir, file).split(sep).slice(0, -1).join('/');
    pages[dir ? `/${dir}/` : '/'] = index.get(key);
  }
  mkdirSync(join(distDir, 'world'), { recursive: true });
  writeFileSync(join(distDir, 'world', 'places.json'), JSON.stringify({ specs, pages }));
  return Object.keys(pages).length;
}

export default function placesMap() {
  return {
    name: 'hyruuk-places-map',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const n = buildPlacesMap(fileURLToPath(dir));
        logger.info(`world/places.json: ${n} pages`);
      },
    },
  };
}
