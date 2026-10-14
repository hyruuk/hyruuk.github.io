/**
 * Automatic placement of new items: rooms come from the item type, places (keywords) are suggested
 * by matching the item's text against each keyword's `match:` words in src/content/keywords.yaml.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

/** Item types offered by `npm run add` and the GitHub "New item" form. */
export const TYPES = [
  'project',
  'paper',
  'preprint',
  'talk',
  'poster',
  'performance',
  'demo',
  'media',
  'teaching',
  'dataset',
  'software',
];

/** Where each type is stored. */
export const STORAGE = {
  project: 'project',
  dataset: 'project',
  software: 'project',
  paper: 'publication',
  preprint: 'publication',
  talk: 'event',
  poster: 'event',
  performance: 'event',
  demo: 'event',
  media: 'event',
  teaching: 'event',
};

/** Default rooms per type (you can always add more). */
export const ROOMS_BY_TYPE = {
  project: [],
  paper: ['research'],
  preprint: ['research'],
  talk: ['research'],
  poster: ['research'],
  dataset: ['code'],
  software: ['code'],
  performance: ['art-music'],
  demo: ['art-music'],
  media: [],
  teaching: [],
};

export const ROOMS = ['research', 'code', 'art-music'];

export function loadKeywords(root) {
  return parse(readFileSync(join(root, 'src/content/keywords.yaml'), 'utf8'));
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Normalise text for matching: lowercase, no accents, hyphens as spaces, single spaces. */
function normalise(text) {
  return ` ${String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim()} `;
}

/**
 * Suggest places for a piece of text.
 * @returns {{id: string, score: number, hits: string[]}[]} best first
 */
export function suggestPlaces(text, keywords, max = 4) {
  const t = normalise(text);
  return keywords
    .map((k) => {
      const hits = [];
      let score = 0;
      for (const word of k.match ?? []) {
        const w = normalise(word).trim();
        if (!w) continue;
        const re = new RegExp(`(^|[^a-z0-9])${escapeRe(w)}(s)?([^a-z0-9]|$)`);
        if (re.test(t)) {
          hits.push(word);
          score += w.includes(' ') ? 2 : 1;
        }
      }
      return { id: k.id, score, hits };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}

export function suggestRooms(type) {
  return ROOMS_BY_TYPE[type] ?? [];
}

export function slugify(text, max = 48) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
}
