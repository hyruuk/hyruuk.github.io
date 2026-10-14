#!/usr/bin/env node
/**
 * Convert a Spotify playlist export (CSV from https://exportify.app — columns "Track URI",
 * "Track Name", "Artist Name(s)", …) into public/data/liked-tracks.json, the list the site's
 * music player draws random tracks from.
 *
 *   npm run spotify -- ~/Downloads/Liked_Songs.csv
 *
 * Only the track id, title and artists are kept (no account ids, dates or audio features).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const OUT = join(ROOT, 'public/data/liked-tracks.json');

const src = process.argv[2];
if (!src) {
  console.error('Usage: npm run spotify -- path/to/Liked_Songs.csv');
  process.exit(1);
}

/** RFC 4180-ish CSV parser (quoted fields, doubled quotes, newlines inside quotes). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r[0]);
}

const rows = parseCsv(readFileSync(src, 'utf8').replace(/^﻿/, ''));
const header = rows.shift() ?? [];
const col = (name) => {
  const i = header.indexOf(name);
  if (i === -1) throw new Error(`Column "${name}" not found. Is this an Exportify CSV? Columns: ${header.join(', ')}`);
  return i;
};
const [iUri, iName, iArtists] = [col('Track URI'), col('Track Name'), col('Artist Name(s)')];

const seen = new Set();
const tracks = [];
for (const r of rows) {
  const uri = r[iUri] ?? '';
  if (!uri.startsWith('spotify:track:')) continue; // skip local files / podcasts
  const id = uri.split(':')[2];
  if (seen.has(id)) continue;
  seen.add(id);
  tracks.push({ id, name: r[iName], artists: (r[iArtists] ?? '').replace(/;/g, ', ') });
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(tracks));
console.log(`wrote ${tracks.length} tracks → ${OUT}`);
