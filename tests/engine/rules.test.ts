import { describe, expect, it } from 'vitest';
import { getLegalCards, getTrickWinner, nextSeat, teamOf } from '../../src/engine/rules';
import { ids, trick } from './helpers';

const idsOf = (cards: { id: string }[]) => cards.map((c) => c.id);

describe('seat model', () => {
  it('next(seat) = (seat + 1) % 4 and team(seat) = seat % 2', () => {
    expect([0, 1, 2, 3].map((s) => nextSeat(s as 0 | 1 | 2 | 3))).toEqual([1, 2, 3, 0]);
    expect([0, 1, 2, 3].map((s) => teamOf(s as 0 | 1 | 2 | 3))).toEqual([0, 1, 0, 1]);
  });
});

describe('getLegalCards', () => {
  const hand = ids('AS 9H 7H KD 8C');

  it('allows any card when leading', () => {
    expect(idsOf(getLegalCards(hand, trick(0)))).toEqual(['AS', '9H', '7H', 'KD', '8C']);
  });

  it('must follow suit when able', () => {
    expect(idsOf(getLegalCards(hand, trick(3, 'KH')))).toEqual(['9H', '7H']);
    expect(idsOf(getLegalCards(hand, trick(2, 'QS', 'AD')))).toEqual(['AS']);
  });

  it('follows the led suit, not the current winning suit', () => {
    // Clubs led, then a trump (spade) played: following suit still means clubs.
    expect(idsOf(getLegalCards(hand, trick(2, '10C', 'KS')))).toEqual(['8C']);
  });

  it('allows any card when void in the led suit', () => {
    expect(idsOf(getLegalCards(ids('AS 9H KD'), trick(1, '7C')))).toEqual(['AS', '9H', 'KD']);
  });
});

describe('getTrickWinner', () => {
  it('highest card of the led suit wins without trumps', () => {
    expect(getTrickWinner(trick(0, '10D', 'KD', '7D', 'JD'), 'S')).toBe(1);
  });

  it('an off-suit discard never wins, even a higher rank', () => {
    expect(getTrickWinner(trick(0, '10D', 'AC', 'AH', '7D'), 'S')).toBe(0);
  });

  it('the highest trump wins', () => {
    expect(getTrickWinner(trick(2, 'AD', '7S', 'KD', 'JS'), 'S')).toBe(1); // JS by seat 1
  });

  it('a lone trump wins', () => {
    expect(getTrickWinner(trick(1, 'AH', 'KH', 'QH', '7C'), 'C')).toBe(0); // 7C by seat 0
  });

  it('works on a partial trick (current winner)', () => {
    expect(getTrickWinner(trick(3, 'QH', 'AH'), 'S')).toBe(0);
    expect(getTrickWinner(trick(3, 'QH'), 'S')).toBe(3);
  });

  it('works with no trump chosen', () => {
    expect(getTrickWinner(trick(0, '8C', '9C', 'AS', '7C'), null)).toBe(1);
  });

  it('throws on an empty trick', () => {
    expect(() => getTrickWinner(trick(0), 'S')).toThrow();
  });
});
