/**
 * Content queries shared by all pages: projects (merged EN/FR), keywords, publications, events,
 * and the cross-links between the two indexes (places = keywords, rooms = sections).
 */
import { type CollectionEntry, getCollection } from 'astro:content';
import type { Lang } from '../i18n/utils';
import { regionExtras, regions } from './data';

export type Section = 'research' | 'code' | 'art-music';
export const SECTION_ORDER: Section[] = ['research', 'code', 'art-music'];

export type KeywordEntry = CollectionEntry<'keywords'>;
export type PublicationEntry = CollectionEntry<'publications'>;
export type EventEntry = CollectionEntry<'events'>;

export interface Project {
  id: string;
  title: string;
  summary: string;
  coverAlt?: string;
  /** false when a French page falls back to the English text */
  translated: boolean;
  data: CollectionEntry<'projects'>['data'];
  entry: CollectionEntry<'projects'>;
  frEntry?: CollectionEntry<'projectsFr'>;
  /** first keyword = the place the project "lives" in */
  primary: string;
  /** first section = the room that decides the tile shape and colour ('community' if none) */
  room: Section | 'community';
}

let cache: Promise<{
  keywords: KeywordEntry[];
  projectsEn: CollectionEntry<'projects'>[];
  projectsFr: Map<string, CollectionEntry<'projectsFr'>>;
  publications: PublicationEntry[];
  events: EventEntry[];
}> | null = null;

function loadAll() {
  cache ??= (async () => {
    const [keywords, allProjects, projectsFr, publications, events] = await Promise.all([
      getCollection('keywords'),
      getCollection('projects'),
      getCollection('projectsFr'),
      getCollection('publications'),
      getCollection('events'),
    ]);
    keywords.sort((a, b) => a.data.order - b.data.order);
    const frMap = new Map(projectsFr.map((p) => [p.id, p]));
    // References are checked against every project, drafts included; drafts are then hidden in production.
    checkIntegrity({ keywords, projectIds: new Set(allProjects.map((p) => p.id)), projectsFr: frMap, publications, events });
    return {
      keywords,
      projectsEn: allProjects.filter((p) => !(import.meta.env.PROD && p.data.draft)),
      projectsFr: frMap,
      publications,
      events,
    };
  })();
  return cache;
}

/** Fail the build early, with a readable message, when content points at something that doesn't exist. */
function checkIntegrity(d: {
  keywords: KeywordEntry[];
  projectIds: Set<string>;
  projectsFr: Map<string, CollectionEntry<'projectsFr'>>;
  publications: PublicationEntry[];
  events: EventEntry[];
}) {
  const problems: string[] = [];
  const projectIds = d.projectIds;
  const keywordIds = new Set(d.keywords.map((k) => k.id));
  for (const [file, items] of [
    ['publications.yaml', d.publications],
    ['events.yaml', d.events],
  ] as const) {
    for (const item of items) {
      for (const ref of item.data.projects) {
        if (!projectIds.has(ref.id)) {
          problems.push(`${file} → "${item.id}": project "${ref.id}" does not exist (folder src/content/projects/${ref.id}/)`);
        }
      }
    }
  }
  for (const id of d.projectsFr.keys()) {
    if (!projectIds.has(id)) {
      problems.push(`projects/${id}/fr.md has no matching en.md`);
    }
  }
  for (const id of Object.keys(regions)) {
    if (!keywordIds.has(id)) problems.push(`src/data/regions.yaml → "${id}" is not a keyword id in keywords.yaml`);
  }
  for (const extra of regionExtras) {
    if (!['about', 'contact', 'projects', 'research', 'code', 'art-music', 'brains-and-games'].includes(extra.page)) {
      problems.push(`src/data/regions.yaml → extras.${extra.id}: unknown page "${extra.page}"`);
    }
  }
  if (problems.length) throw new Error(`Content problems:\n  • ${problems.join('\n  • ')}`);
}

function toProject(entry: CollectionEntry<'projects'>, fr: CollectionEntry<'projectsFr'> | undefined, lang: Lang): Project {
  const useFr = lang === 'fr' && !!fr;
  return {
    id: entry.id,
    title: useFr ? fr!.data.title : entry.data.title,
    summary: (useFr ? fr!.data.summary : undefined) ?? entry.data.summary,
    coverAlt: (useFr ? fr!.data.coverAlt : undefined) ?? entry.data.coverAlt,
    translated: lang === 'en' || !!fr,
    data: entry.data,
    entry,
    frEntry: fr,
    primary: entry.data.keywords[0],
    room: entry.data.sections[0] ?? 'community',
  };
}

/** Importance first (featured, weight), then most recent. */
export function sortProjects(list: Project[]): Project[] {
  const time = (p: Project) => {
    const end = p.data.end;
    return end === 'ongoing' ? Date.now() : (end ?? p.data.start).getTime();
  };
  return [...list].sort(
    (a, b) =>
      Number(b.data.featured) - Number(a.data.featured) ||
      b.data.weight - a.data.weight ||
      time(b) - time(a) ||
      a.title.localeCompare(b.title),
  );
}

export async function getKeywords(): Promise<KeywordEntry[]> {
  return (await loadAll()).keywords;
}

export async function getProjects(lang: Lang): Promise<Project[]> {
  const d = await loadAll();
  return sortProjects(d.projectsEn.map((e) => toProject(e, d.projectsFr.get(e.id), lang)));
}

export async function getProject(id: string, lang: Lang): Promise<Project | undefined> {
  return (await getProjects(lang)).find((p) => p.id === id);
}

export async function projectsForKeyword(kw: string, lang: Lang): Promise<Project[]> {
  return (await getProjects(lang)).filter((p) => p.data.keywords.includes(kw));
}

export async function projectsForSection(section: Section, lang: Lang): Promise<Project[]> {
  return (await getProjects(lang)).filter((p) => p.data.sections.includes(section));
}

export async function getPublications(): Promise<PublicationEntry[]> {
  const pubs = [...(await loadAll()).publications];
  const statusRank = { 'in-preparation': 3, 'under-review': 2, 'in-press': 1, preprint: 0, published: 0 } as const;
  return pubs.sort(
    (a, b) => statusRank[b.data.status] - statusRank[a.data.status] || b.data.year - a.data.year || a.data.title.localeCompare(b.data.title),
  );
}

export async function getEvents(): Promise<EventEntry[]> {
  return [...(await loadAll()).events].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** An item's own keywords plus the keywords of the projects it belongs to. */
export async function effectiveKeywords(item: PublicationEntry | EventEntry): Promise<string[]> {
  const d = await loadAll();
  const set = new Set(item.data.keywords);
  for (const ref of item.data.projects) {
    d.projectsEn.find((p) => p.id === ref.id)?.data.keywords.forEach((k) => set.add(k));
  }
  return [...set];
}

export async function publicationsForKeyword(kw: string): Promise<PublicationEntry[]> {
  const pubs = await getPublications();
  const out: PublicationEntry[] = [];
  for (const p of pubs) if ((await effectiveKeywords(p)).includes(kw)) out.push(p);
  return out;
}

export async function eventsForKeyword(kw: string): Promise<EventEntry[]> {
  const events = await getEvents();
  const out: EventEntry[] = [];
  for (const e of events) if ((await effectiveKeywords(e)).includes(kw)) out.push(e);
  return out;
}

export async function publicationsOfProject(id: string): Promise<PublicationEntry[]> {
  return (await getPublications()).filter((p) => p.data.projects.some((r) => r.id === id));
}

export async function eventsOfProject(id: string): Promise<EventEntry[]> {
  return (await getEvents()).filter((e) => e.data.projects.some((r) => r.id === id));
}

/** Projects sharing the most keywords with this one. */
export async function relatedProjects(project: Project, lang: Lang, n = 3): Promise<Project[]> {
  const mine = new Set(project.data.keywords);
  return (await getProjects(lang))
    .filter((p) => p.id !== project.id)
    .map((p) => {
      const shared = p.data.keywords.filter((k) => mine.has(k)).length;
      const union = new Set([...mine, ...p.data.keywords]).size;
      return { p, score: shared / union };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.p);
}

/** Number of projects per room for a keyword: { research: 3, code: 2, 'art-music': 1 } */
export async function roomCounts(kw: string): Promise<Record<Section, number>> {
  const list = await projectsForKeyword(kw, 'en');
  const counts = { research: 0, code: 0, 'art-music': 0 } as Record<Section, number>;
  for (const p of list) for (const s of p.data.sections) counts[s as Section]++;
  return counts;
}

/** Bold the site owner's name in an author list. */
export function isMe(author: string): boolean {
  return /^Harel\b|Harel,? Y\.?|Yann (T\. )?Harel/.test(author);
}
