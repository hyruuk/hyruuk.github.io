import { describe, expect, it } from 'vitest';
import { compose, seeded, sizeFor } from '../../src/lib/compose';

describe('place composition', () => {
  it('places every item exactly once, for any count', () => {
    for (let n = 0; n <= 25; n++) {
      const items = Array.from({ length: n }, (_, i) => i);
      const { left, right } = compose(items, `kw-${n}`);
      const placed = [...left, ...right].map((p) => p.item).sort((a, b) => a - b);
      expect(placed).toEqual(items);
    }
  });

  it('gives the most important item the large tile', () => {
    const { left, right } = compose(['a', 'b', 'c'], 'music');
    const first = [...left, ...right].find((p) => p.item === 'a');
    expect(first?.size).toBe('L');
    expect(sizeFor(5, 1, false)).toBe('S');
    expect(sizeFor(5, 3, false)).toBe('L');
  });

  it('is deterministic per place', () => {
    const a = compose([1, 2, 3, 4, 5], 'videogames');
    const b = compose([1, 2, 3, 4, 5], 'videogames');
    expect(a).toEqual(b);
    expect(seeded('x')()).toBe(seeded('x')());
  });
});
