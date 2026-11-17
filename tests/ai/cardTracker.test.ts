import { describe, expect, it } from 'vitest';
import {
  buildTracker,
  isMaster,
  isVoid,
  masterOf,
  trumpsOutsideHand,
  trumpsRemaining,
} from '../../src/ai/cardTracker';
import { cardFromId } from '../../src/engine/cards';
import { done, ids, trick, viewFrom } from './helpers';

// Trick 1: seat 0 leads K♥, seat 1 plays A♥, seat 2 discards 8♣ (void in hearts), seat 3 trumps 9♠.
const completed = [done(trick(0, 'KH', 'AH', '8C', '9S'), 3)];

describe('card tracker (SPEC §4.1)', () => {
  it('records played cards from completed tricks and the current trick', () => {
    const view = viewFrom({ hand: 'QH 7D', completed, current: trick(3, '7C') });
    const t = buildTracker(view, 'full');
    expect([...t.played].sort()).toEqual(['7C', '8C', '9S', 'AH', 'KH'].sort());
  });

  it('marks a player void when they fail to follow suit', () => {
    const t = buildTracker(viewFrom({ hand: 'QH 7D', completed }), 'full');
    expect(isVoid(t, 2, 'H')).toBe(true);
    expect(isVoid(t, 3, 'H')).toBe(true);
    expect(isVoid(t, 1, 'H')).toBe(false);
    expect(isVoid(t, 0, 'H')).toBe(false);
  });

  it('finds the master card once higher cards are played', () => {
    const t = buildTracker(viewFrom({ hand: 'QH 7D', completed }), 'full');
    expect(masterOf(t, 'H')).toBe('QH');
    expect(isMaster(t, cardFromId('QH'))).toBe(true);
    expect(masterOf(t, 'C')).toBe('AC');
    expect(isMaster(t, cardFromId('KC'))).toBe(false);
  });

  it('counts trumps remaining and trumps outside my hand', () => {
    const t = buildTracker(viewFrom({ hand: 'AS KS 7D', completed }), 'full');
    expect(trumpsRemaining(t)).toBe(7); // 9♠ played
    expect(trumpsOutsideHand(t, ids('AS KS 7D'))).toBe(5);
  });

  it('basic mode (Medium) forgets earlier tricks and never records voids', () => {
    const view = viewFrom({ hand: 'QH 7D', completed, current: trick(3, '7C') });
    const t = buildTracker(view, 'basic');
    expect([...t.played]).toEqual(['7C']);
    expect(isVoid(t, 2, 'H')).toBe(false);
    expect(masterOf(t, 'H')).toBe('AH');
  });
});
