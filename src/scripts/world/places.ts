/**
 * Where every page sits in the world, so a flight can start the moment a link is clicked, without
 * waiting for the next page to download. Built after `astro build` from the pages themselves
 * (integrations/places-map.mjs → /world/places.json); missing in `astro dev`, where flights simply
 * start once the new page has arrived.
 */
export type PlaceInfo = { camera: string; stage: string; look: string };

let map: { specs: [string, string, string][]; pages: Record<string, number> } | null = null;
let loading: Promise<void> | null = null;

export function loadPlaces() {
  loading ??= fetch('/world/places.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (j?.specs && j?.pages) map = j;
    })
    .catch(() => {});
  return loading;
}

export function placeOf(url: URL): PlaceInfo | null {
  if (!map || url.origin !== location.origin) return null;
  const path = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  let i = map.pages[path];
  if (i === undefined) {
    try {
      i = map.pages[decodeURI(path)];
    } catch {
      /* malformed URL */
    }
  }
  const s = i === undefined ? undefined : map.specs[i];
  return s ? { camera: s[0], stage: s[1], look: s[2] } : null;
}

export const placeKey = (p: PlaceInfo) => `${p.stage}|${p.look}|${p.camera}`;
