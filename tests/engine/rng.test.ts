import { describe, expect, it } from 'vitest';
import { mulberry32, shuffle } from '../../src/engine/rng';

describe('mulberry32', () => {
  it('is reproducible for the same seed', () => {
    const a = mulberry32(99);
    const b = mulberry32(99);
    for (let i = 0; i < 20; i++) expect(a.next()).toBe(b.next());
  });

  it('returns values in [0, 1)', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('continues the same sequence when restored from its state', () => {
    const rng = mulberry32(42);
    rng.next();
    rng.next();
    const restored = mulberry32(rng.state);
    for (let i = 0; i < 10; i++) expect(restored.next()).toBe(rng.next());
  });
});

describe('shuffle', () => {
  it('does not mutate the input and keeps every item', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...input];
    const out = shuffle(input, mulberry32(3));
    expect(input).toEqual(copy);
    expect([...out].sort((x, y) => x - y)).toEqual(copy);
  });
});
