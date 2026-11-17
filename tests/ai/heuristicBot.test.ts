import { describe, expect, it } from 'vitest';
import { buildTracker } from '../../src/ai/cardTracker';
import { chooseHeuristicCard, createHeuristicBot } from '../../src/ai/heuristicBot';
import type { PlayerView } from '../../src/engine/types';
import { done, trick, viewFrom } from './helpers';

const hard = (view: PlayerView) => chooseHeuristicCard(view, buildTracker(view, 'full'));
const medium = (view: PlayerView) => chooseHeuristicCard(view, buildTracker(view, 'basic'));

// Seat 0 = me, 2 = partner, 1 and 3 = opponents. Trumps are spades unless stated.
describe('heuristic policy: following suit (SPEC §4.4)', () => {
  it('only one legal card → ONLY_LEGAL', () => {
    const view = viewFrom({ hand: 'AH 7S 8D', current: trick(3, 'KH') });
    expect(hard(view)).toEqual({ cardId: 'AH', reasons: ['ONLY_LEGAL'] });
  });

  it('partner winning and I am last → lowest card + PARTNER_WINNING', () => {
    const view = viewFrom({ hand: 'KH 8H 7H 8C', current: trick(1, '9H', 'AH', '10H') });
    expect(hard(view)).toEqual({ cardId: '7H', reasons: ['PARTNER_WINNING'] });
  });

  it('partner winning with the master in third seat → lowest card + PARTNER_WINNING', () => {
    const view = viewFrom({ hand: 'KH 7H 8C', current: trick(2, 'AH', '9H') });
    expect(hard(view)).toEqual({ cardId: '7H', reasons: ['PARTNER_WINNING'] });
  });

  it('last to play and can win → the lowest winning card + WIN_CHEAPLY', () => {
    const view = viewFrom({ hand: 'AH QH 8H 7C', current: trick(1, '9H', '7H', 'JH') });
    expect(hard(view)).toEqual({ cardId: 'QH', reasons: ['WIN_CHEAPLY'] });
  });

  it('second to play with the master → CASH_MASTER', () => {
    const view = viewFrom({ hand: 'AH 7H 8C', current: trick(3, '9H') });
    expect(hard(view)).toEqual({ cardId: 'AH', reasons: ['CASH_MASTER'] });
  });

  it('second to play without the master → play low + SECOND_HAND_LOW', () => {
    const view = viewFrom({ hand: 'KH 7H 8C', current: trick(3, '9H') });
    expect(hard(view)).toEqual({ cardId: '7H', reasons: ['SECOND_HAND_LOW'] });
  });

  it('third to play → the lowest card that beats the current winner + WIN_CHEAPLY', () => {
    const view = viewFrom({ hand: 'AH QH JH 8C', current: trick(2, '7H', '10H') });
    expect(hard(view)).toEqual({ cardId: 'JH', reasons: ['WIN_CHEAPLY'] });
  });

  it('cannot win → lowest card + DISCARD_LOW', () => {
    const view = viewFrom({ hand: 'QH 8H 9C', current: trick(1, 'AH', '7H', 'KH') });
    expect(hard(view)).toEqual({ cardId: '8H', reasons: ['DISCARD_LOW'] });
  });
});

describe('heuristic policy: cannot follow suit', () => {
  it('void with an opponent winning → lowest trump + RUFF', () => {
    const view = viewFrom({ hand: '9S 7S AD 8C', current: trick(3, 'KH') });
    expect(hard(view)).toEqual({ cardId: '7S', reasons: ['RUFF'] });
  });

  it('an opponent trumped → the lowest trump that beats it + OVERRUFF', () => {
    const view = viewFrom({ hand: '7S JS QS AD 8C', current: trick(2, 'KH', '9S') });
    expect(hard(view)).toEqual({ cardId: 'JS', reasons: ['OVERRUFF'] });
  });

  it('cannot overruff → lowest non-master discard + DISCARD_LOW, SAVE_TRUMP', () => {
    const view = viewFrom({ hand: '7S 9D 8C QC', current: trick(1, 'KH', '7H', 'AS') });
    expect(hard(view)).toEqual({ cardId: '8C', reasons: ['DISCARD_LOW', 'SAVE_TRUMP'] });
  });

  it('never discards a master when another card will do', () => {
    const view = viewFrom({ hand: '7S AD 9C', current: trick(1, 'KH', '7H', 'AS') });
    expect(hard(view).cardId).toBe('9C');
  });

  it('partner winning with the master → discard from the weakest suit + PARTNER_WINNING', () => {
    const view = viewFrom({ hand: '7S 9D KD 8C', current: trick(2, 'AH', '7H') });
    expect(hard(view)).toEqual({ cardId: '8C', reasons: ['PARTNER_WINNING'] });
  });
});

describe('heuristic policy: leading', () => {
  it('holds a non-trump master → CASH_MASTER', () => {
    const view = viewFrom({ hand: 'AH 7H 8D 9C 7S' });
    expect(hard(view)).toEqual({ cardId: 'AH', reasons: ['CASH_MASTER'] });
  });

  it('a king is the master once the ace is played (Hard tracks it, Medium does not)', () => {
    const completed = [done(trick(0, '7H', 'AH', '8H', '9H'), 1)];
    const view = viewFrom({ hand: 'KH 8D 9D 9C 8C 7S', completed });
    expect(hard(view)).toEqual({ cardId: 'KH', reasons: ['CASH_MASTER'] });
    expect(medium(view).reasons).not.toContain('CASH_MASTER');
  });

  it('my team chose trumps and I hold 4+ trumps → highest trump + DRAW_TRUMPS', () => {
    const view = viewFrom({ hand: 'AS KS 9S 7S 8H 9D 10C 7C', chooser: 0 });
    expect(hard(view)).toEqual({ cardId: 'AS', reasons: ['DRAW_TRUMPS'] });
  });

  it('does not draw trumps when the other team chose them', () => {
    const view = viewFrom({ hand: 'AS KS 9S 7S 8H 9D 10C 7C', chooser: 1 });
    expect(hard(view).reasons).not.toContain('DRAW_TRUMPS');
  });

  it('partner is void in a suit → lead it low + LEAD_PARTNER_VOID', () => {
    const completed = [done(trick(0, 'KD', '7D', '9H', '8D'), 0)];
    const view = viewFrom({ hand: '10D 9D 8H 7C 9C 8S 7S', completed });
    expect(hard(view)).toEqual({ cardId: '9D', reasons: ['LEAD_PARTNER_VOID'] });
  });

  it('avoids a suit an opponent can ruff → LEAD_LONG_SUIT + AVOID_OPPONENT_RUFF', () => {
    const completed = [done(trick(0, 'KH', '8C', '7H', '9H'), 0)];
    const view = viewFrom({ hand: 'QH JH 10H 8D 7D 9S 8S', completed });
    expect(hard(view)).toEqual({
      cardId: '7D',
      reasons: ['LEAD_LONG_SUIT', 'AVOID_OPPONENT_RUFF'],
    });
    // Medium does not track voids, so it leads its longest suit.
    expect(medium(view)).toEqual({ cardId: '10H', reasons: ['LEAD_LONG_SUIT'] });
  });

  it('otherwise → lowest card of the longest non-trump suit + LEAD_LONG_SUIT', () => {
    const view = viewFrom({ hand: 'KH 9H 7H QD 8D 9C 8S' });
    expect(hard(view)).toEqual({ cardId: '7H', reasons: ['LEAD_LONG_SUIT'] });
  });

  it('only trumps left → lowest trump', () => {
    const view = viewFrom({ hand: 'KS 9S 7S', chooser: 1 });
    expect(hard(view).cardId).toBe('7S');
  });
});

describe('createHeuristicBot', () => {
  it('chooses trumps by the SPEC §4.2 score', () => {
    const view = viewFrom({ hand: 'AH KH 7C 8C' });
    expect(createHeuristicBot('basic').chooseTrump(view)).toBe('H');
  });
});
