import { describe, expect, it } from 'vitest';
import type { Bot } from '../../src/ai/bot';
import { createBot } from '../../src/ai/botFactory';
import { createEasyBot, longestSuit } from '../../src/ai/easyBot';
import { getLegalCards } from '../../src/engine/rules';
import { applyAction, createGame } from '../../src/engine/stateMachine';
import type { GameState, Seat } from '../../src/engine/types';
import { getPlayerView } from '../../src/engine/view';
import { ids, settings } from '../engine/helpers';

/** Plays a whole game with four Easy bots that see only their PlayerView. */
function playBotGame(seed: number): GameState {
  const bots = ([0, 1, 2, 3] as const).map((s) => createEasyBot(seed * 31 + s)) as Bot[];
  let s = createGame(settings(), seed);
  for (let guard = 0; guard < 5000; guard++) {
    switch (s.phase) {
      case 'DEAL_FIRST':
        s = applyAction(s, { type: 'START_ROUND' });
        break;
      case 'CHOOSE_TRUMP': {
        const seat = s.round.trumpChooser;
        const view = getPlayerView(s, seat);
        expect(view.hand).toHaveLength(4);
        s = applyAction(s, { type: 'CHOOSE_TRUMP', seat, suit: bots[seat]!.chooseTrump(view) });
        break;
      }
      case 'DEAL_SECOND':
        s = applyAction(s, { type: 'DEAL_SECOND' });
        break;
      case 'PLAYING': {
        const seat: Seat = s.round.turn;
        const { cardId } = bots[seat]!.chooseCard(getPlayerView(s, seat));
        const legal = getLegalCards(s.round.hands[seat], s.round.currentTrick).map((c) => c.id);
        expect(legal).toContain(cardId);
        s = applyAction(s, { type: 'PLAY_CARD', seat, cardId });
        break;
      }
      case 'ROUND_END':
        s = applyAction(s, { type: 'NEXT_ROUND' });
        break;
      case 'GAME_OVER':
        return s;
    }
  }
  throw new Error('game did not end');
}

describe('Easy bot (SPEC §4.3)', () => {
  it('always plays a legal card and finishes whole games', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const end = playBotGame(seed);
      expect(end.phase).toBe('GAME_OVER');
      expect(Math.max(...end.scores)).toBeGreaterThanOrEqual(end.settings.targetScore);
    }
  });

  it('is deterministic for the same seed and view', () => {
    let s = applyAction(createGame(settings(), 7), { type: 'START_ROUND' });
    s = applyAction(s, { type: 'CHOOSE_TRUMP', seat: s.round.trumpChooser, suit: 'H' });
    s = applyAction(s, { type: 'DEAL_SECOND' });
    const view = getPlayerView(s, s.round.turn);
    const a = createEasyBot(123).chooseCard(view);
    const b = createEasyBot(123).chooseCard(view);
    expect(a).toEqual(b);
  });

  it('varies its choice across seeds', () => {
    let s = applyAction(createGame(settings(), 7), { type: 'START_ROUND' });
    s = applyAction(s, { type: 'CHOOSE_TRUMP', seat: s.round.trumpChooser, suit: 'H' });
    s = applyAction(s, { type: 'DEAL_SECOND' });
    const view = getPlayerView(s, s.round.turn);
    const picks = new Set(
      Array.from({ length: 40 }, (_, i) => createEasyBot(i).chooseCard(view).cardId),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it('gives ONLY_LEGAL when it has one legal card', () => {
    let s = applyAction(createGame(settings(), 3), { type: 'START_ROUND' });
    s = applyAction(s, { type: 'CHOOSE_TRUMP', seat: s.round.trumpChooser, suit: 'S' });
    s = applyAction(s, { type: 'DEAL_SECOND' });
    const view = { ...getPlayerView(s, s.round.turn), hand: ids('AS') };
    expect(createEasyBot(1).chooseCard(view)).toEqual({ cardId: 'AS', reasons: ['ONLY_LEGAL'] });
  });
});

describe('Easy trump choice: the suit with the most cards', () => {
  it('picks the longest suit', () => {
    expect(longestSuit(ids('7H 8H 9H AS'))).toBe('H');
    expect(longestSuit(ids('7C 8C AD KD'))).toBe('D'); // 2–2 tie: A♦ beats 8♣
    expect(longestSuit(ids('AS KH QD JC'))).toBe('S'); // all 1: A is the highest
  });

  it('Easy picks the longest suit; Medium and Hard use the SPEC §4.2 score', () => {
    const view = { hand: ids('7C 8C 9C AS') } as never;
    expect(createBot('easy', 1).chooseTrump(view)).toBe('C');
    // Clubs 2×3 = 6, spades 2×1 + A4 = 6: the tie goes to the higher top card.
    expect(createBot('medium', 1).chooseTrump(view)).toBe('S');
    expect(createBot('hard', 1).chooseTrump(view)).toBe('S');
  });
});
