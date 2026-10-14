/**
 * Pre-fill a new item from a link: DOI (Crossref, then DataCite), GitHub repository,
 * YouTube / Vimeo / SoundCloud / Spotify (oEmbed). Every lookup is best-effort: on failure the
 * item is simply not pre-filled.
 */

const UA = 'hyruuk-website/1.0 (+https://hyruuk.github.io; add-item script)';

export function detectLink(raw) {
  const url = String(raw ?? '').trim();
  if (!url) return null;
  const doi = url.match(/\b(10\.\d{4,9}\/[^\s"<>]+)/);
  if (doi) return { kind: 'doi', id: doi[1].replace(/[.,;)]+$/, ''), url: `https://doi.org/${doi[1].replace(/[.,;)]+$/, '')}` };
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'github.com') {
    const [owner, repo] = u.pathname.split('/').filter(Boolean);
    if (owner && repo) return { kind: 'github', id: `${owner}/${repo.replace(/\.git$/, '')}`, url };
  }
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const v = u.searchParams.get('v');
    if (v) return { kind: 'youtube', id: v, url };
  }
  if (host === 'youtu.be') return { kind: 'youtube', id: u.pathname.slice(1), url };
  if (host === 'vimeo.com') {
    const id = u.pathname.split('/').filter(Boolean).find((p) => /^\d+$/.test(p));
    if (id) return { kind: 'vimeo', id, url };
  }
  if (host === 'soundcloud.com') return { kind: 'soundcloud', id: url, url };
  if (host === 'open.spotify.com') {
    const [type, id] = u.pathname.split('/').filter(Boolean).filter((p) => !p.startsWith('intl-'));
    if (type && id) return { kind: 'spotify', id: `${type}/${id}`, url };
  }
  return { kind: 'web', id: url, url };
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

/** "Jean-François" → "J.-F.", "Pierre Henri" → "P. H." */
export function initials(given = '') {
  return given
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      part
        .split('-')
        .map((p) => (p ? `${p[0].toUpperCase()}.` : ''))
        .join('-'),
    )
    .join(' ');
}

const CROSSREF_TYPES = {
  'journal-article': 'article',
  'posted-content': 'preprint',
  'proceedings-article': 'conference',
  'book-chapter': 'chapter',
  dissertation: 'thesis',
  dataset: 'dataset',
  'peer-review': 'article',
};

export async function fromDoi(doi) {
  try {
    const m = (await getJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)).message;
    const year = m.issued?.['date-parts']?.[0]?.[0] ?? m.created?.['date-parts']?.[0]?.[0];
    const venue = [m['container-title']?.[0], m.volume, m['article-number'] ?? m.page].filter(Boolean).join(', ');
    return {
      title: (m.title?.[0] ?? '').replace(/\s+/g, ' ').trim(),
      authors: (m.author ?? []).map((a) => (a.family ? `${a.family}, ${initials(a.given)}`.trim().replace(/,$/, '') : a.name)),
      year,
      venue: venue || (m.type === 'posted-content' ? m.institution?.[0]?.name ?? 'Preprint' : undefined),
      type: CROSSREF_TYPES[m.type] ?? 'article',
      abstract: m.abstract?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      doi,
    };
  } catch {
    /* not in Crossref: try DataCite (theses, Zenodo, OSF…) */
  }
  try {
    const a = (await getJson(`https://api.datacite.org/dois/${encodeURIComponent(doi)}`)).data.attributes;
    return {
      title: a.titles?.[0]?.title,
      authors: (a.creators ?? []).map((c) => (c.familyName ? `${c.familyName}, ${initials(c.givenName)}` : c.name)),
      year: a.publicationYear,
      venue: a.publisher,
      type: { Dataset: 'dataset', Software: 'software', Text: 'article' }[a.types?.resourceTypeGeneral] ?? (/thesis/i.test(a.types?.resourceType ?? '') ? 'thesis' : 'article'),
      abstract: a.descriptions?.[0]?.description,
      doi,
    };
  } catch {
    return null;
  }
}

export async function fromGithub(fullName, token) {
  try {
    const r = await getJson(`https://api.github.com/repos/${fullName}`, token ? { Authorization: `Bearer ${token}` } : {});
    return {
      title: r.name,
      summary: r.description ?? '',
      homepage: r.homepage || undefined,
      topics: r.topics ?? [],
      language: r.language,
      year: Number(r.created_at?.slice(0, 4)),
      url: r.html_url,
    };
  } catch {
    return null;
  }
}

export async function fromOembed(kind, url) {
  const endpoint = {
    youtube: `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    vimeo: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
    soundcloud: `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    spotify: `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
  }[kind];
  if (!endpoint) return null;
  try {
    const r = await getJson(endpoint);
    return { title: r.title, author: r.author_name, thumbnail: r.thumbnail_url };
  } catch {
    return null;
  }
}
