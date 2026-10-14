/**
 * Content collections — the schemas every content file must follow.
 *
 * If something is wrong (a misspelled keyword, a missing field…), `npm run build` stops with a
 * message naming the file and the field. See docs/EDITING.md → "When a build fails".
 */
import { existsSync, readFileSync } from 'node:fs';
import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { parse } from 'yaml';

/* ---------- shared vocabularies ---------- */

// Keyword ids come from keywords.yaml, so a typo such as "videogame" fails with the list of valid ids.
const keywordIds = (parse(readFileSync('src/content/keywords.yaml', 'utf8')) as { id: string }[]).map((k) => k.id);
const Keyword = z.enum(keywordIds as [string, ...string[]]);

export const SECTIONS = ['research', 'code', 'art-music'] as const;
const Section = z.enum(SECTIONS);

const Localized = z.object({ en: z.string(), fr: z.string() });
const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: 'colour must look like "#ffd166"' });

/** Accepts 2024, "2024", "2024-08" or a full date; stores a Date (UTC). */
const DateLike = z.preprocess((v) => {
  if (v instanceof Date) return v;
  if (typeof v === 'number' && v > 1900 && v < 2200) return new Date(Date.UTC(v, 0, 1));
  if (typeof v === 'string') {
    if (/^\d{4}$/.test(v)) return new Date(Date.UTC(Number(v), 0, 1));
    if (/^\d{4}-\d{2}$/.test(v)) {
      const [y, m] = v.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, 1));
    }
    return new Date(v);
  }
  return v;
}, z.date({ error: 'expected a date such as 2024, 2024-08 or 2024-08-15' }));

const Link = z.object({
  label: z.string(),
  url: z.url(),
  kind: z
    .enum(['paper', 'preprint', 'code', 'data', 'video', 'audio', 'demo', 'website', 'slides', 'poster', 'docs', 'other'])
    .default('other'),
});

/** a silent looping video in public/media/…, e.g. "/media/ezbv/rotation.mp4" */
const VideoPath = z
  .string()
  .regex(/^\/media\/[\w./-]+\.(mp4|webm)$/, { error: 'videos live in public/media/ and end in .mp4 or .webm' })
  .refine((p) => existsSync(`public${p}`), { error: 'video file not found in public/' });

const Media = z.object({
  kind: z.enum(['youtube', 'vimeo', 'spotify', 'soundcloud']),
  /** YouTube/Vimeo video id, Spotify URI path ("track/…", "album/…", "playlist/…") or SoundCloud URL */
  id: z.string(),
  title: z.string().optional(),
});

/* ---------- collections ---------- */

const keywords = defineCollection({
  loader: file('src/content/keywords.yaml'),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: 'ids use lowercase letters, digits and dashes' }),
    order: z.number(),
    accent: Hex,
    label: Localized,
    blurb: Localized,
    match: z.array(z.string()).default([]),
  }),
});

const projects = defineCollection({
  loader: glob({
    pattern: '*/en.md',
    base: './src/content/projects',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        summary: z.string().max(260, { error: 'keep the summary under 260 characters (it is shown on tiles)' }),
        kind: z.enum(['project', 'community']).default('project'),
        start: DateLike,
        end: z.union([z.literal('ongoing'), DateLike]).optional(),
        sections: z.array(Section).default([]),
        keywords: z.array(Keyword).min(1, { error: 'give at least one keyword (place)' }),
        cover: image().optional(),
        coverAlt: z.string().optional(),
        coverCredit: z.string().optional(),
        /** optional silent loop over the cover: plays on the project page, and on hover in tiles */
        coverVideo: VideoPath.optional(),
        /** which part of the cover to keep when a tile crops it (CSS object-position, e.g. "50% 30%") */
        coverFocus: z.string().regex(/^\d{1,3}% \d{1,3}%$/, { error: 'coverFocus looks like "50% 30%"' }).optional(),
        /** figures shown after the text: images next to en.md (PNG, JPG, WebP or animated GIF) */
        figures: z
          .array(
            z.object({
              /** the image (for a video: its still frame) */
              src: image(),
              /** optional silent loop played in place of the image */
              video: VideoPath.optional(),
              alt: z.union([z.string(), Localized], { error: 'alt: describe the figure for screen readers' }),
              caption: z.union([z.string(), Localized]).optional(),
              credit: z.string().optional(),
              /** "wide" spans the page, "plate" puts a white backing behind it, "small" keeps it narrow */
              style: z.enum(['normal', 'wide', 'plate', 'small']).default('normal'),
            }),
          )
          .default([]),
        weight: z.number().int().min(1).max(3).default(1),
        featured: z.boolean().default(false),
        role: z.string().optional(),
        /** optional internal page this tile links to instead of the project page, e.g. /brains-and-games/ */
        href: z.string().startsWith('/').optional(),
        collaborators: z.array(z.string()).default([]),
        links: z.array(Link).default([]),
        media: z.array(Media).default([]),
        draft: z.boolean().default(false),
      })
      .refine((p) => p.kind === 'community' || p.sections.length > 0, {
        error: 'sections: a project needs at least one room (research, code or art-music)',
        path: ['sections'],
      })
      .refine((p) => !p.cover || !!p.coverAlt, {
        error: 'coverAlt: describe the cover image for screen readers',
        path: ['coverAlt'],
      })
      .refine((p) => !p.coverVideo || !!p.cover, {
        error: 'coverVideo needs a cover image too (shown before the video plays)',
        path: ['coverVideo'],
      }),
});

const projectsFr = defineCollection({
  loader: glob({
    pattern: '*/fr.md',
    base: './src/content/projects',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: z.object({
    title: z.string(),
    summary: z.string().max(260).optional(),
    coverAlt: z.string().optional(),
  }),
});

const publications = defineCollection({
  loader: file('src/content/publications.yaml'),
  schema: z.object({
    id: z.string(),
    type: z.enum(['article', 'preprint', 'conference', 'abstract', 'chapter', 'thesis', 'dataset', 'software', 'patent', 'essay']),
    status: z.enum(['published', 'in-press', 'under-review', 'in-preparation', 'preprint']).default('published'),
    title: z.string(),
    authors: z.array(z.string()).min(1),
    year: z.number().int(),
    venue: z.string().optional(),
    doi: z
      .string()
      .regex(/^10\.\d{4,9}\/\S+$/, { error: 'doi should look like 10.1371/journal.pone.0290158 (no https://doi.org/)' })
      .optional(),
    url: z.url().optional(),
    pdf: z.url().optional(),
    code: z.url().optional(),
    data: z.url().optional(),
    note: z.string().optional(),
    keywords: z.array(Keyword).default([]),
    projects: z.array(reference('projects')).default([]),
    featured: z.boolean().default(false),
  }),
});

const events = defineCollection({
  loader: file('src/content/events.yaml'),
  schema: z.object({
    id: z.string(),
    type: z.enum(['talk', 'poster', 'performance', 'demo', 'workshop', 'teaching', 'media', 'organization']),
    title: z.string(),
    date: DateLike,
    event: z.string(),
    location: z.string().optional(),
    url: z.url().optional(),
    video: z.url().optional(),
    slides: z.url().optional(),
    note: z.string().optional(),
    keywords: z.array(Keyword).default([]),
    projects: z.array(reference('projects')).default([]),
    featured: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({ title: z.string() }),
});

export const collections = { keywords, projects, projectsFr, publications, events, pages };
