import { describe, expect, it } from 'vitest';
import { cardFromId, compareRank, isCardId, rankValue, RANKS } from '../../src/engine/cards';

describe('cards', () => {
  it('orders ranks A > K > Q > J > 10 > 9 > 8 > 7', () => {
    const values = RANKS.map(rankValue);
    expect(RANKS).toEqual(['A', 'K', 'Q', 'J', '10', '9', '8', '7']);
    for (let i = 1; i < values.length; i++) {
      expect(values[i - 1]).toBeGreaterThan(values[i] as number);
    }
  });

  it('parses card ids', () => {
    expect(cardFromId('10H')).toEqual({ id: '10H', rank: '10', suit: 'H' });
    expect(cardFromId('AS')).toEqual({ id: 'AS', rank: 'A', suit: 'S' });
    expect(() => cardFromId('1H')).toThrow();
    expect(() => cardFromId('6S')).toThrow();
    expect(() => cardFromId('AX')).toThrow();
  });

  it('recognises valid ids only', () => {
    expect(isCardId('7C')).toBe(true);
    expect(isCardId('10D')).toBe(true);
    expect(isCardId('2C')).toBe(false);
    expect(isCardId('A')).toBe(false);
    expect(isCardId(42)).toBe(false);
  });

  it('compares ranks', () => {
    expect(compareRank(cardFromId('AS'), cardFromId('KS'))).toBeGreaterThan(0);
    expect(compareRank(cardFromId('7H'), cardFromId('8H'))).toBeLessThan(0);
    expect(compareRank(cardFromId('10H'), cardFromId('10S'))).toBe(0);
  });
});
