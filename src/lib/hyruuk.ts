/**
 * HYRUUK — "Harel Yann's {R} {U1} of {U2} {K}". Shared by the server (one draw baked into the HTML)
 * and the browser (a new draw on every visit / click). No Node or Astro imports here.
 */
export interface Word {
  word: string;
  evokes: string;
  weight: number;
}

export interface Vocab {
  template: string;
  R: Word[];
  U1: Word[];
  U2: Word[];
  K: Word[];
  avoid: [string, string][];
}

export type Slot = 'R' | 'U1' | 'U2' | 'K';
export const SLOTS: Slot[] = ['R', 'U1', 'U2', 'K'];
export type Draw = Record<Slot, Word>;

function weighted(list: Word[], rand: () => number): Word {
  const usable = list.filter((w) => w.weight > 0);
  const total = usable.reduce((s, w) => s + w.weight, 0);
  let r = rand() * total;
  for (const w of usable) {
    r -= w.weight;
    if (r <= 0) return w;
  }
  return usable[usable.length - 1];
}

/** Two words share a stem when their first four letters match (Universe/Universal, Unfolding/Unfolding…) */
export function sameStem(a: string, b: string): boolean {
  const k = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '').slice(0, 4);
  return k(a) === k(b);
}

export function isValid(v: Vocab, d: Draw): boolean {
  if (sameStem(d.U1.word, d.U2.word)) return false;
  const words = SLOTS.map((s) => d[s].word.toLowerCase());
  return !v.avoid.some(([a, b]) => words.includes(a.toLowerCase()) && words.includes(b.toLowerCase()));
}

export function draw(v: Vocab, rand: () => number = Math.random, previous?: Draw): Draw {
  for (let i = 0; i < 500; i++) {
    const d: Draw = { R: weighted(v.R, rand), U1: weighted(v.U1, rand), U2: weighted(v.U2, rand), K: weighted(v.K, rand) };
    if (!isValid(v, d)) continue;
    if (previous && SLOTS.filter((s) => previous[s].word === d[s].word).length >= 2) continue;
    return d;
  }
  throw new Error('HYRUUK: could not draw a valid combination — check src/data/hyruuk.yaml');
}

/** Split the template around the slots: ["Harel Yann's ", R, " ", U1, " of ", U2, " ", K, ""] */
export function templateParts(template: string): (string | Slot)[] {
  return template.split(/\{(R|U1|U2|K)\}/).map((part, i) => (i % 2 === 1 ? (part as Slot) : part));
}

export function expand(v: Vocab, d: Draw): string {
  return templateParts(v.template)
    .map((p, i) => (i % 2 === 1 ? d[p as Slot].word : p))
    .join('');
}
