import { describe, expect, it } from 'vitest';
import { sortHand, suitOrder } from '../../src/ui/sortHand';
import { ids } from '../engine/helpers';

const order = (list: string, trump: Parameters<typeof suitOrder>[1]) =>
  sortHand(ids(list), trump).map((c) => c.id);

describe('sortHand (SPEC §8.2)', () => {
  it('puts trumps first, then alternates colours, high to low within a suit', () => {
    expect(order('7S AH 9D KC 10H JS 8C QD', 'H')).toEqual([
      'AH',
      '10H',
      'JS',
      '7S',
      'QD',
      '9D',
      'KC',
      '8C',
    ]);
  });

  it('uses the default alternating order before trumps are chosen', () => {
    expect(suitOrder(ids('7S AH 9D KC'), null)).toEqual(['S', 'H', 'C', 'D']);
  });

  it('keeps colours apart when a suit is missing', () => {
    // Trump ♠ (black), no ♥: ♦ must go between ♠ and ♣.
    expect(suitOrder(ids('AS 7C 8D'), 'S')).toEqual(['S', 'D', 'C']);
  });

  it('does not change the input', () => {
    const hand = ids('7S AS');
    sortHand(hand, 'S');
    expect(hand.map((c) => c.id)).toEqual(['7S', 'AS']);
  });
});
