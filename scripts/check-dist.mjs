#!/usr/bin/env node
/**
 * Post-build checks on dist/ (run automatically by `npm run build`):
 *   - no page collides with the other sites hosted on hyruuk.github.io (/over.run/, …)
 *   - every internal link and asset points to a file that exists
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
// Project sites served under the same domain by other repositories — never generate these paths.
const RESERVED = ['over.run', 'cookiecutter-neuroscience', 'unf-montreal.ca', 'dev'];

const problems = [];
for (const r of RESERVED) {
  if (existsSync(join(DIST, r))) problems.push(`dist/${r}/ exists — it would hide the site at hyruuk.github.io/${r}/`);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const exists = (urlPath) => {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  const p = join(DIST, clean);
  if (clean.endsWith('/')) return existsSync(join(p, 'index.html'));
  return existsSync(p) || existsSync(join(p, 'index.html'));
};

let pages = 0;
let links = 0;
for (const file of walk(DIST)) {
  if (!file.endsWith('.html')) continue;
  pages++;
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/\s(?:href|src|data-href-en|data-href-fr)="(\/[^"]*)"/g)) {
    const url = m[1];
    if (url.startsWith('//')) continue;
    if (RESERVED.some((r) => url.startsWith(`/${r}/`))) continue;
    links++;
    if (!exists(url)) problems.push(`${relative(DIST, file)} → ${url} (missing)`);
  }
}

if (problems.length) {
  console.error(`\n✗ check-dist found ${problems.length} problem(s):\n  • ${[...new Set(problems)].slice(0, 60).join('\n  • ')}`);
  process.exit(1);
}
console.log(`✓ check-dist: ${pages} pages, ${links} internal links OK, no reserved paths`);
