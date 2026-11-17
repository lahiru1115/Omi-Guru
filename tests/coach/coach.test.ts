import { describe, expect, it } from 'vitest';
import { buildTracker } from '../../src/ai/cardTracker';
import { chooseHeuristicCard } from '../../src/ai/heuristicBot';
import { areEquivalent, groupEquivalent } from '../../src/coach/equivalence';
import { getHint, getTrumpHint } from '../../src/coach/hintEngine';
import { reviewMove } from '../../src/coach/review';
import { cardFromId } from '../../src/engine/cards';
import { applyAction, createGame, createRoundFromPreset } from '../../src/engine/stateMachine';
import type { CardId, GameState, RoundPreset } from '../../src/engine/types';
import { getPlayerView } from '../../src/engine/view';
import { settings } from '../engine/helpers';
import { done, ids, trick, viewFrom } from '../ai/helpers';

const c = cardFromId;

describe('equivalent cards (SPEC §5.1)', () => {
  it('adjacent cards in my hand are equivalent (8♣ and 7♣)', () => {
    const view = viewFrom({ hand: '8C 7C KH' });
    expect(areEquivalent(c('8C'), c('7C'), view)).toBe(true);
  });

  it('a gap held by someone else makes cards different', () => {
    const view = viewFrom({ hand: '10C 8C KH' });
    expect(areEquivalent(c('10C'), c('8C'), view)).toBe(false);
  });

  it('played cards close the gap', () => {
    const completed = [done(trick(1, '9C', 'AC', 'JC', 'QC'), 2)];
    const view = viewFrom({ hand: '10C 8C KH', completed });
    expect(areEquivalent(c('10C'), c('8C'), view)).toBe(true);
    expect(areEquivalent(c('10C'), c('KH'), view)).toBe(false);
  });

  it('groups cards into equivalence classes', () => {
    const view = viewFrom({ hand: 'KH QH 9H 8H 7C' });
    const groups = groupEquivalent(view.hand, view).map((g) => g.map((x) => x.id));
    expect(groups).toEqual([['KH', 'QH'], ['9H', '8H'], ['7C']]);
  });
});

describe('getHint', () => {
  it('uses the heuristic policy with full tracking, with reasons', () => {
    const completed = [done(trick(0, 'KH', '8C', '7H', '9H'), 0)];
    const view = viewFrom({ hand: 'QH JH 10H 8D 7D 9S 8S', completed });
    expect(getHint(view)).toEqual(chooseHeuristicCard(view, buildTracker(view, 'full')));
    expect(getHint(view)).toEqual({
      cardId: '7D',
      reasons: ['LEAD_LONG_SUIT', 'AVOID_OPPONENT_RUFF'],
    });
  });

  it('depends only on the human view, not on other players’ hidden cards', () => {
    const mine: CardId[] = ['AS', 'KS', 'QS', '7H', '8H', '9D', '10D', 'JC'];
    const rest = ids(
      'JS 10S 9S 8S 7S AH KH QH JH 10H 9H AD KD QD JD 8D 7D AC KC QC 10C 9C 8C 7C',
    ).map((x) => x.id);
    const presetA: RoundPreset = {
      dealer: 3,
      trump: 'S',
      hands: [mine, rest.slice(0, 8), rest.slice(8, 16), rest.slice(16)],
    };
    const shuffled = [...rest].reverse();
    const presetB: RoundPreset = {
      dealer: 3,
      trump: 'S',
      hands: [mine, shuffled.slice(0, 8), shuffled.slice(8, 16), shuffled.slice(16)],
    };
    const base = createGame(settings(), 1);
    const a: GameState = createRoundFromPreset(base, presetA);
    const b: GameState = createRoundFromPreset(base, presetB);
    expect(getHint(getPlayerView(a, 0))).toEqual(getHint(getPlayerView(b, 0)));
  });
});

describe('getTrumpHint (SPEC §5.5)', () => {
  it('suggests the best-scoring suit with its count and high cards', () => {
    let s = applyAction(createGame(settings(), 3), { type: 'START_ROUND' });
    const chooser = s.round.trumpChooser;
    const view = { ...getPlayerView(s, chooser), hand: ids('7H KH AH 8C') };
    const hint = getTrumpHint(view);
    expect(hint).toMatchObject({ suit: 'H', count: 3, highCards: ['AH', 'KH'] });
    expect(hint.ranking.map((r) => r.suit)).toEqual(['H', 'C', 'S', 'D']);
    s = applyAction(s, { type: 'CHOOSE_TRUMP', seat: chooser, suit: hint.suit });
    expect(s.round.trump).toBe('H');
  });
});

describe('reviewMove (SPEC §5.1, §5.3)', () => {
  it('GOOD when the card is equivalent to the best card', () => {
    const view = viewFrom({ hand: 'KH 8H 7H 8C', current: trick(1, '9H', 'AH', '10H') });
    expect(reviewMove(view, '8H')).toEqual({
      verdict: 'GOOD',
      bestCardId: '7H',
      bestReasons: ['PARTNER_WINNING'],
      mistakes: [],
    });
    expect(reviewMove(view, '7H').verdict).toBe('GOOD');
  });

  it('OK when the card differs but has no detected mistake', () => {
    const view = viewFrom({ hand: 'AH 7H 8D 9C 7S' });
    expect(reviewMove(view, '8D')).toMatchObject({ verdict: 'OK', bestCardId: 'AH', mistakes: [] });
  });

  it('OVERTOOK_PARTNER', () => {
    const view = viewFrom({ hand: 'KH 7H 8C', current: trick(1, '9H', 'QH', '10H') });
    expect(reviewMove(view, 'KH')).toMatchObject({
      verdict: 'BETTER_EXISTS',
      bestCardId: '7H',
      mistakes: ['OVERTOOK_PARTNER'],
    });
  });

  it('TRUMPED_PARTNER', () => {
    const view = viewFrom({ hand: '7S 8C 9D', current: trick(1, '9H', 'AH', '10H') });
    expect(reviewMove(view, '7S')).toMatchObject({
      verdict: 'BETTER_EXISTS',
      mistakes: ['TRUMPED_PARTNER'],
    });
  });

  it('WASTED_HIGH_CARD', () => {
    const view = viewFrom({ hand: 'QH 7H 8C', current: trick(1, 'AH', '9H', '10H') });
    expect(reviewMove(view, 'QH')).toMatchObject({
      verdict: 'BETTER_EXISTS',
      bestCardId: '7H',
      mistakes: ['WASTED_HIGH_CARD'],
    });
  });

  it('THREW_MASTER', () => {
    const view = viewFrom({ hand: 'AD 8C 7S', current: trick(1, 'KH', '7H', '9H') });
    expect(reviewMove(view, 'AD')).toMatchObject({
      verdict: 'BETTER_EXISTS',
      bestCardId: '7S',
      mistakes: ['THREW_MASTER'],
    });
  });

  it('LED_INTO_RUFF', () => {
    const completed = [done(trick(0, 'KH', '8C', '7H', '9H'), 0)];
    const view = viewFrom({ hand: 'QH JH 10H 8D 7D 9S 8S', completed });
    expect(reviewMove(view, 'QH')).toMatchObject({
      verdict: 'BETTER_EXISTS',
      bestCardId: '7D',
      mistakes: ['LED_INTO_RUFF'],
    });
  });

  it('UNNECESSARY_TRUMP', () => {
    const view = viewFrom({ hand: 'AH 7H 9S 8D', chooser: 1 });
    expect(reviewMove(view, '9S')).toMatchObject({
      verdict: 'BETTER_EXISTS',
      bestCardId: 'AH',
      mistakes: ['UNNECESSARY_TRUMP'],
    });
  });

  it('OVERPAID_WIN', () => {
    const view = viewFrom({ hand: 'AH QH 8H 7C', current: trick(1, '9H', '7H', 'JH') });
    expect(reviewMove(view, 'AH')).toMatchObject({
      verdict: 'BETTER_EXISTS',
      bestCardId: 'QH',
      mistakes: ['OVERPAID_WIN'],
    });
  });

  it('rejects a card that is not legal', () => {
    const view = viewFrom({ hand: 'AH 7S', current: trick(3, 'KH') });
    expect(() => reviewMove(view, '7S')).toThrow();
  });
});
