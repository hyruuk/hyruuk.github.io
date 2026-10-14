#!/usr/bin/env node
/**
 * Add something to the website — a project, paper, talk, performance… — and place it automatically
 * in the right rooms (from its type) and places (from its words, see `match:` in keywords.yaml).
 *
 *   npm run add                                  # interactive: answer a few questions
 *   npm run add -- --link 10.1162/IMAG.a.1256    # start from a link (DOI, GitHub, YouTube…)
 *
 * Used by the GitHub "New item" form (.github/workflows/add-item.yml):
 *   node scripts/add-item.mjs --from-issue "$GITHUB_EVENT_PATH" --out result.json
 * For tests:
 *   node scripts/add-item.mjs --from-json item.json --dry-run
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stringify } from 'yaml';
import { loadKeywords, ROOMS, slugify, STORAGE, suggestPlaces, suggestRooms, TYPES } from './lib/classify.mjs';
import { formFields, parseIssueBody } from './lib/form.mjs';
import { detectLink, fromDoi, fromGithub, fromOembed } from './lib/metadata.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const PROJECTS = join(ROOT, 'src/content/projects');
const PUBLICATIONS = join(ROOT, 'src/content/publications.yaml');
const EVENTS = join(ROOT, 'src/content/events.yaml');

/* ---------------- helpers ---------------- */

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

const today = () => new Date().toISOString().slice(0, 10);

function normaliseDate(value) {
  const v = String(value ?? '').trim();
  if (!v) return undefined;
  if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(v)) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/** "Label | https://…" lines → links */
function parseLinks(text) {
  return String(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.includes('|') ? line.split('|').map((s) => s.trim()) : ['Link', line];
      return { label, url, kind: /github\.com/.test(url) ? 'code' : /youtu|vimeo/.test(url) ? 'video' : 'website' };
    })
    .filter((l) => /^https?:\/\//.test(l.url));
}

/** First image URL in a Markdown/HTML snippet (GitHub issue attachments). */
function extractImage(text) {
  const m = String(text ?? '').match(/!\[[^\]]*\]\((https?:[^)\s]+)\)|<img[^>]+src="(https?:[^"]+)"|(https?:\S+\.(?:png|jpe?g|webp)\b)/i);
  return m ? m[1] ?? m[2] ?? m[3] : undefined;
}

function uniqueSlug(base, exists) {
  let slug = base || 'item';
  for (let i = 2; exists(slug); i++) slug = `${base}-${i}`;
  return slug;
}

function existingIds(file) {
  if (!existsSync(file)) return new Set();
  return new Set([...readFileSync(file, 'utf8').matchAll(/^- id: ["']?([^"'\n]+)/gm)].map((m) => m[1].trim()));
}

function appendYaml(file, entry) {
  const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const sep = current.endsWith('\n') ? '\n' : '\n\n';
  appendFileSync(file, sep + stringify([entry], { lineWidth: 0 }));
}

const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)));

/* ---------------- 1. build the item ---------------- */

export async function buildItem(raw, keywords) {
  const type = TYPES.includes(raw.type) ? raw.type : 'project';
  const item = {
    type,
    title: raw.title?.trim(),
    date: normaliseDate(raw.date),
    summary: raw.summary?.trim(),
    summaryFr: raw.summary_fr?.trim(),
    event: raw.event?.trim(),
    location: raw.location?.trim(),
    project: raw.project?.trim(),
    rooms: (raw.rooms ?? []).filter((r) => ROOMS.includes(r)),
    places: (raw.places ?? []).filter((p) => keywords.some((k) => k.id === p)),
    featured: (raw.options ?? []).includes('featured') || raw.featured === true,
    publish: (raw.options ?? []).includes('publish') || raw.publish === true,
    links: parseLinks(raw.links),
    image: extractImage(raw.image),
    media: [],
    notes: [],
    link: undefined,
  };
  let text = [item.title, item.summary, item.event].filter(Boolean).join(' ');

  const link = detectLink(raw.link);
  if (link?.kind === 'doi') {
    const m = await fromDoi(link.id);
    item.doi = link.id;
    if (m) {
      item.title ||= m.title;
      item.authors = m.authors;
      item.year = m.year;
      item.venue = m.venue;
      item.pubType = m.type;
      text += ` ${m.title} ${m.abstract ?? ''} ${m.venue ?? ''}`;
      item.notes.push('Details filled in from the DOI (Crossref/DataCite).');
    } else item.notes.push(`Could not look up DOI ${link.id} — please check the details.`);
    if (STORAGE[type] !== 'publication') item.links.unshift({ label: 'Paper', url: link.url, kind: 'paper' });
  } else if (link?.kind === 'github') {
    const g = await fromGithub(link.id, process.env.GITHUB_TOKEN);
    item.links.unshift({ label: 'Code', url: g?.url ?? link.url, kind: 'code' });
    if (g) {
      item.title ||= g.title;
      item.summary ||= g.summary;
      item.year ||= g.year;
      if (g.homepage) item.links.push({ label: 'Website', url: g.homepage, kind: 'website' });
      text += ` ${g.summary} ${g.topics.join(' ')} ${g.language ?? ''}`;
      item.notes.push('Details filled in from GitHub.');
    }
  } else if (link && ['youtube', 'vimeo', 'soundcloud', 'spotify'].includes(link.kind)) {
    const o = await fromOembed(link.kind, link.url);
    item.title ||= o?.title;
    item.media.push(clean({ kind: link.kind, id: link.id, title: o?.title }));
    item.links.unshift({ label: { youtube: 'Video', vimeo: 'Video', soundcloud: 'Listen', spotify: 'Listen' }[link.kind], url: link.url, kind: link.kind === 'youtube' || link.kind === 'vimeo' ? 'video' : 'audio' });
    text += ` ${o?.title ?? ''} ${o?.author ?? ''}`;
  } else if (link?.kind === 'web') {
    item.links.unshift({ label: 'Website', url: link.url, kind: 'website' });
  }
  item.link = link;

  if (!item.title) throw new Error('No title: type one, or give a link the robot can read (DOI, GitHub, YouTube…).');
  item.dateValue = item.date ?? (item.year ? String(item.year) : today());

  if (!item.rooms.length) {
    item.rooms = suggestRooms(type);
    if (item.rooms.length) item.notes.push(`Rooms chosen from the type: ${item.rooms.join(', ')}.`);
  }
  if (!item.places.length) {
    const suggestions = suggestPlaces(text, keywords);
    item.places = suggestions.map((s) => s.id);
    item.notes.push(
      suggestions.length
        ? `Places suggested from the text: ${suggestions.map((s) => `${s.id} (${s.hits.slice(0, 4).join(', ')})`).join('; ')}.`
        : 'No place matched the text — please add keywords by hand.',
    );
  }
  if (item.project && !existsSync(join(PROJECTS, item.project, 'en.md'))) {
    item.notes.push(`Project "${item.project}" does not exist — the link to it was dropped.`);
    item.project = undefined;
  }
  return item;
}

/* ---------------- 2. write it ---------------- */

async function downloadImage(url, dir) {
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
    if (!res.ok) return undefined;
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif' }[res.headers.get('content-type')?.split(';')[0] ?? ''];
    if (!ext) return undefined;
    const file = `cover.${ext}`;
    writeFileSync(join(dir, file), Buffer.from(await res.arrayBuffer()));
    return `./${file}`;
  } catch {
    return undefined;
  }
}

async function writeProject(item, dryRun) {
  const slug = uniqueSlug(slugify(item.title), (s) => existsSync(join(PROJECTS, s)));
  const dir = join(PROJECTS, slug);
  const notes = [...item.notes];
  let keywords = item.places;
  let draft;
  if (!keywords.length) {
    keywords = ['videogames'];
    draft = true;
    notes.push('Saved as a draft (hidden) with a placeholder place: set its `keywords:` and remove `draft: true`.');
  }
  let sections = item.rooms;
  if (!sections.length) {
    sections = ['research'];
    notes.push('No room given: put in Research — change `sections:` if needed.');
  }
  if (!dryRun) mkdirSync(dir, { recursive: true });
  const cover = item.image && !dryRun ? await downloadImage(item.image, dir) : undefined;
  if (item.image && !cover && !dryRun) notes.push('The cover image could not be downloaded — add it by hand as cover.jpg.');
  const fm = clean({
    title: item.title,
    summary: (item.summary || item.title).replace(/\s+/g, ' ').slice(0, 255),
    start: item.dateValue,
    end: 'ongoing',
    sections,
    keywords,
    featured: item.featured || undefined,
    weight: item.featured ? 2 : undefined,
    cover,
    coverAlt: cover ? item.title : undefined,
    links: item.links,
    media: item.media,
    draft,
  });
  const body = `\n${item.summary || item.title}\n\n<!-- Tell the story here: what, why, how, with whom. Markdown works: **bold**, [links](https://…), lists. -->\n`;
  const files = [join(dir, 'en.md')];
  if (!dryRun) writeFileSync(files[0], `---\n${stringify(fm, { lineWidth: 0 })}---\n${body}`);
  if (item.summaryFr) {
    files.push(join(dir, 'fr.md'));
    if (!dryRun) writeFileSync(files[1], `---\n${stringify({ title: item.title, summary: item.summaryFr.slice(0, 255) }, { lineWidth: 0 })}---\n\n${item.summaryFr}\n`);
  }
  return { kind: 'project', id: slug, files, url: `/projects/${slug}/`, keywords, rooms: sections, notes };
}

function writePublication(item, dryRun) {
  const ids = existingIds(PUBLICATIONS);
  const first = (item.authors?.[0] ?? 'harel').split(',')[0];
  const id = uniqueSlug(slugify(`${first}${String(item.dateValue).slice(0, 4)}-${item.title.split(/\s+/).slice(0, 2).join('-')}`), (s) => ids.has(s));
  const type = item.type === 'preprint' ? 'preprint' : item.pubType ?? 'article';
  const entry = clean({
    id,
    type,
    status: type === 'preprint' ? 'preprint' : undefined,
    title: item.title,
    authors: item.authors?.length ? item.authors : ['Harel, Y.'],
    year: Number(String(item.dateValue).slice(0, 4)),
    venue: item.event || item.venue,
    doi: item.doi,
    url: item.doi ? undefined : item.link?.url,
    keywords: item.project ? undefined : item.places,
    projects: item.project ? [item.project] : undefined,
    featured: item.featured || undefined,
  });
  if (!dryRun) appendYaml(PUBLICATIONS, entry);
  return { kind: 'publication', id, files: [PUBLICATIONS], url: item.project ? `/projects/${item.project}/` : '/research/', keywords: item.places, rooms: ['research'], notes: item.notes, entry };
}

function writeEvent(item, dryRun) {
  const ids = existingIds(EVENTS);
  const year = String(item.dateValue).slice(0, 4);
  const where = item.event || item.type;
  const id = uniqueSlug(slugify(`${where}${where.includes(year) ? '' : `-${year}`}-${item.title.split(/\s+/).slice(0, 3).join('-')}`), (s) => ids.has(s));
  const isVideo = item.link && ['youtube', 'vimeo'].includes(item.link.kind);
  const entry = clean({
    id,
    type: item.type,
    title: item.title,
    date: item.dateValue,
    event: item.event || '—',
    location: item.location,
    url: !isVideo ? item.link?.url ?? item.links[0]?.url : undefined,
    video: isVideo ? item.link.url : undefined,
    keywords: item.project ? undefined : item.places,
    projects: item.project ? [item.project] : undefined,
    featured: item.featured || undefined,
  });
  if (!dryRun) appendYaml(EVENTS, entry);
  const room = { performance: '/art-music/', demo: '/art-music/', media: '/about/', teaching: '/about/' }[item.type] ?? '/research/';
  return { kind: 'event', id, files: [EVENTS], url: item.project ? `/projects/${item.project}/` : room, keywords: item.places, rooms: item.rooms, notes: item.notes, entry };
}

export async function writeItem(item, { dryRun = false } = {}) {
  const storage = STORAGE[item.type];
  const result =
    storage === 'project' ? await writeProject(item, dryRun) : storage === 'publication' ? writePublication(item, dryRun) : writeEvent(item, dryRun);
  return { ...result, title: item.title, type: item.type, publish: item.publish };
}

/* ---------------- 3. interactive mode ---------------- */

async function interactive(args, keywords) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (q, def) => {
    const a = (await rl.question(`${q}${def ? ` [${def}]` : ''}: `)).trim();
    return a || def || '';
  };
  console.log('\nAdd an item to the website — press Enter to accept the [suggestion].\n');
  const link = args.link && args.link !== true ? args.link : await ask('Link (DOI, GitHub, YouTube, web page — optional)');
  const detected = detectLink(link);
  const guess = { doi: 'paper', github: 'software', youtube: 'media', vimeo: 'media', soundcloud: 'performance', spotify: 'performance' }[detected?.kind] ?? 'project';
  const type = await ask(`Type (${TYPES.join(', ')})`, guess);
  const raw = { link, type };
  const draft = await buildItem({ ...raw }, keywords).catch(() => null);
  raw.title = await ask('Title', draft?.title);
  raw.date = await ask('Date (2026, 2026-05 or 2026-05-14)', draft?.dateValue);
  raw.summary = await ask('Summary (1–3 sentences, English)', draft?.summary);
  raw.summary_fr = await ask('Summary in French (optional)');
  if (STORAGE[type] === 'event') {
    raw.event = await ask('Event (e.g. OHBM 2027)');
    raw.location = await ask('Location');
  }
  if (STORAGE[type] !== 'project') raw.project = await ask('Part of which project? (folder name, optional)');
  const preview = await buildItem({ ...raw }, keywords);
  for (const n of preview.notes) console.log(`  · ${n}`);
  raw.rooms = (await ask(`Rooms (${ROOMS.join(', ')})`, preview.rooms.join(', '))).split(/[ ,]+/).filter(Boolean);
  console.log(`  places: ${keywords.map((k) => k.id).join(', ')}`);
  raw.places = (await ask('Places', preview.places.join(', '))).split(/[ ,]+/).filter(Boolean);
  raw.featured = /^y/i.test(await ask('Featured (shown bigger)? y/N', 'n'));
  const item = await buildItem(raw, keywords);
  const ok = await ask('Write it? Y/n', 'y');
  rl.close();
  if (!/^y/i.test(ok)) process.exit(0);
  return item;
}

/* ---------------- main ---------------- */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const keywords = loadKeywords(ROOT);
  let item;
  if (args['from-issue']) {
    const event = JSON.parse(readFileSync(args['from-issue'], 'utf8'));
    const raw = parseIssueBody(event.issue?.body ?? '', formFields(keywords));
    item = await buildItem(raw, keywords);
  } else if (args['from-json']) {
    item = await buildItem(JSON.parse(readFileSync(args['from-json'], 'utf8')), keywords);
  } else {
    item = await interactive(args, keywords);
  }
  const result = await writeItem(item, { dryRun: !!args['dry-run'] });
  if (args.out && args.out !== true) writeFileSync(args.out, JSON.stringify(result, null, 2));
  console.log(`\n${args['dry-run'] ? '(dry run) would add' : '✓ added'} ${result.kind} "${result.title}"`);
  console.log(`  places: ${result.keywords.join(', ') || '—'} · rooms: ${result.rooms.join(', ') || '—'}`);
  for (const f of result.files) console.log(`  file: ${f.replace(ROOT, '')}`);
  for (const n of result.notes) console.log(`  · ${n}`);
  if (!args['dry-run'] && !args['from-issue']) console.log('\nPreview with `npm run dev`, then commit and push to publish.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  });
}
