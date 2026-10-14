/**
 * The "composition" of a place page: a two-column editorial collage computed from the data,
 * so that adding an item never requires any manual layout.
 *
 *   - the most important items get the biggest tiles (featured / weight / recency)
 *   - items go to whichever column is currently shorter, so the collage stays balanced
 *   - alignment and small vertical offsets vary deterministically per place, so every place
 *     looks a little different but stays the same from one build to the next
 */
export type TileSize = 'L' | 'M' | 'S';
export type Align = 'start' | 'center' | 'end';

export interface Placed<T> {
  item: T;
  size: TileSize;
  align: Align;
  /** extra space above the tile, in rem */
  offset: number;
}

export interface Composition<T> {
  left: Placed<T>[];
  right: Placed<T>[];
}

const HEIGHT: Record<TileSize, number> = { L: 1, M: 0.74, S: 0.56 };
const CAPTION = 0.18;

/** Small deterministic PRNG (mulberry32) seeded from a string. */
export function seeded(seed: string) {
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

export function sizeFor(rank: number, weight: number, featured: boolean): TileSize {
  if (rank === 0 || weight >= 3) return 'L';
  if (featured || weight === 2 || rank <= 2) return 'M';
  return 'S';
}

/**
 * @param items already sorted by importance
 * @param seed  e.g. the keyword id
 * @param weightOf / featuredOf accessors for the item's importance
 */
export function compose<T>(
  items: T[],
  seed: string,
  weightOf: (item: T) => number = () => 1,
  featuredOf: (item: T) => boolean = () => false,
): Composition<T> {
  const rand = seeded(seed);
  const mirrored = rand() < 0.5;
  const out: Composition<T> = { left: [], right: [] };
  let hl = 0;
  let hr = 0.35; // the right column starts lower, for a staggered look
  const aligns: Align[] = ['start', 'end', 'center'];

  items.forEach((item, rank) => {
    const size = sizeFor(rank, weightOf(item), featuredOf(item));
    const h = HEIGHT[size] + CAPTION;
    let goLeft = hl <= hr;
    if (rank === 0) goLeft = !mirrored;
    const col = goLeft ? out.left : out.right;
    const align = size === 'L' ? 'center' : aligns[Math.floor(rand() * aligns.length)];
    const offset = rank === 0 ? 0 : Math.round(rand() * 4 * 10) / 10;
    col.push({ item, size, align, offset });
    if (goLeft) hl += h + offset / 10;
    else hr += h + offset / 10;
  });
  return out;
}
