import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { draw, expand, isValid, sameStem, SLOTS, type Vocab } from '../../src/lib/hyruuk';

const raw = parse(readFileSync('src/data/hyruuk.yaml', 'utf8'));
const withWeights = (list: { word: string; evokes: string; weight?: number }[]) => list.map((w) => ({ weight: 1, ...w }));
const vocab: Vocab = { template: raw.template, R: withWeights(raw.R), U1: withWeights(raw.U1), U2: withWeights(raw.U2), K: withWeights(raw.K), avoid: raw.avoid ?? [] };

describe('HYRUUK', () => {
  it('every word starts with its letter', () => {
    for (const w of vocab.R) expect(w.word[0]).toBe('R');
    for (const w of [...vocab.U1, ...vocab.U2]) expect(w.word[0]).toBe('U');
    for (const w of vocab.K) expect(w.word[0]).toBe('K');
  });

  it('Emergent is gone (it is not an R)', () => {
    expect(vocab.R.map((w) => w.word)).not.toContain('Emergent');
  });

  it('draws always spell H-Y-R-U-U-K and never repeat a U stem', () => {
    for (let i = 0; i < 3000; i++) {
      const d = draw(vocab);
      const text = expand(vocab, d);
      expect(text.startsWith("Harel Yann's ")).toBe(true);
      const initials = text.replace(/ of /, ' ').split(/\s+/).map((w) => w[0]).join('');
      expect(initials).toBe('HYRUUK');
      expect(sameStem(d.U1.word, d.U2.word)).toBe(false);
      expect(isValid(vocab, d)).toBe(true);
      for (const s of SLOTS) expect(d[s].weight).toBeGreaterThan(0);
    }
  });

  it('blocks shared stems such as Universe/Universal and Unfolding/Unfolding', () => {
    expect(sameStem('Universe', 'Universal')).toBe(true);
    expect(sameStem('Unfolding', 'Unfolding')).toBe(true);
    expect(sameStem('Uncertainty', 'Uncertain')).toBe(true);
    expect(sameStem('Unity', 'Unseen')).toBe(false);
  });

  it('respects weight 0 (disabled words)', () => {
    const v = { ...vocab, R: [{ word: 'Recursive', evokes: '', weight: 0 }, { word: 'Rhythmic', evokes: '', weight: 1 }] };
    for (let i = 0; i < 200; i++) expect(draw(v).R.word).toBe('Rhythmic');
  });
});
