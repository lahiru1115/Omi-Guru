import { describe, expect, it } from 'vitest';
import { longestSuit } from '../../src/ai/easyBot';
import { chooseTrumpSuit, scoreSuits } from '../../src/ai/trumpChooser';
import { ids } from './helpers';

describe('trump choice: score = 2 × count + points (SPEC §4.2)', () => {
  it('scores every suit, best first', () => {
    const ranking = scoreSuits(ids('AH KH 7C 8C'));
    expect(ranking.map((r) => [r.suit, r.score])).toEqual([
      ['H', 11], // 2×2 + A4 + K3
      ['C', 4], // 2×2
      ['S', 0],
      ['D', 0],
    ]);
    expect(ranking[0]).toMatchObject({ count: 2, points: 7 });
  });

  it('high cards can beat a longer suit (unlike Easy)', () => {
    const hand = ids('AD KD 7C 8C');
    expect(chooseTrumpSuit(ids('AD KD QD 7C'))).toBe('D');
    expect(chooseTrumpSuit(ids('AD 7C 8C 9C'))).toBe('D'); // 6 vs 6: A♦ beats 9♣
    expect(longestSuit(ids('AD 7C 8C 9C'))).toBe('C');
    expect(chooseTrumpSuit(ids('AD KD 7C 9C'))).toBe('D'); // 11 vs 4
    expect(chooseTrumpSuit(hand)).toBe('D');
    expect(chooseTrumpSuit(ids('AH JH 7C 8C 9C'))).toBe('H'); // 9 vs 6
    expect(longestSuit(ids('AH JH 7C 8C 9C'))).toBe('C');
  });

  it('breaks a tie with the higher top card', () => {
    // Hearts: 2×1 + Q2 = 4. Clubs: 2×2 + 0 = 4. Q♥ beats 9♣.
    expect(chooseTrumpSuit(ids('QH 8C 9C 7D'))).toBe('H');
    // Both 2×2 + 1 = 5: J♠ vs J♦ is equal rank, so the higher second card doesn't matter; SUITS order.
    expect(chooseTrumpSuit(ids('JS 7S JD 8D'))).toBe('S');
  });
});
