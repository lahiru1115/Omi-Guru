import { describe, expect, it } from 'vitest';
import { buildTracker } from '../../src/ai/cardTracker';
import { chooseHardCard, createHardBot } from '../../src/ai/hardBot';
import { chooseHeuristicCard } from '../../src/ai/heuristicBot';
import { monteCarloScores, sampleDeal, unknownCards } from '../../src/ai/monteCarlo';
import { mulberry32 } from '../../src/engine/rng';
import { getLegalCards } from '../../src/engine/rules';
import { applyAction, createGame } from '../../src/engine/stateMachine';
import type { CardId, GameState, PlayerView } from '../../src/engine/types';
import { getPlayerView } from '../../src/engine/view';
import { settings } from '../engine/helpers';
import { done, trick, viewFrom } from './helpers';

// Four completed tricks. Seat 2 showed out of hearts in trick 1 and seat 3 showed out of clubs.
const completed = [
  done(trick(0, 'KH', 'AH', '8C', '9H'), 1),
  done(trick(1, 'AC', '9C', '7S', '10C'), 3),
  done(trick(3, '7D', '8D', 'AD', '9D'), 1),
  done(trick(1, 'JD', 'KD', '10D', 'QD'), 2),
];
const view = viewFrom({ hand: 'QH JH KC 7C', completed, current: trick(2, 'JC', '8H') });

function ids(cards: readonly { id: CardId }[]): CardId[] {
  return cards.map((c) => c.id);
}

describe('Monte Carlo deal sampling (SPEC §4.5)', () => {
  it('unknown cards exclude my hand and every played card', () => {
    const unknown = ids(unknownCards(view));
    expect(unknown).toHaveLength(32 - 4 - 18);
    for (const id of ['QH', 'KC', 'AH', 'JC', '8H']) expect(unknown).not.toContain(id);
  });

  it('every sample matches the hand counts and the known voids', () => {
    const tracker = buildTracker(view, 'full');
    const rng = mulberry32(5);
    for (let i = 0; i < 200; i++) {
      const deal = sampleDeal(view, tracker, rng);
      expect(ids(deal[0]).sort()).toEqual(ids(view.hand).sort());
      expect(deal.map((h) => h.length)).toEqual(view.handCounts);
      expect(deal[2].some((c) => c.suit === 'H')).toBe(false);
      expect(deal[3].some((c) => c.suit === 'C')).toBe(false);
      const all = deal.flat().map((c) => c.id);
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it('scores each candidate as average team tricks between 0 and 8', () => {
    const legal = getLegalCards(view.hand, view.currentTrick);
    const scores = monteCarloScores(view, legal, mulberry32(1), 10);
    expect([...scores.keys()]).toEqual(ids(legal));
    for (const s of scores.values()) {
      expect(s).toBeGreaterThanOrEqual(view.tricksWon[0]);
      expect(s).toBeLessThanOrEqual(8);
    }
  });
});

describe('Hard bot', () => {
  it('uses the plain heuristic before trick 4', () => {
    const early = viewFrom({ hand: 'KH 9H 7H QD 8D 9C 8S' });
    expect(chooseHardCard(early, 1)).toEqual(
      chooseHeuristicCard(early, buildTracker(early, 'full')),
    );
  });

  it('is deterministic and always legal', () => {
    const a = chooseHardCard(view, 77);
    const b = chooseHardCard(view, 77);
    expect(a).toEqual(b);
    expect(ids(getLegalCards(view.hand, view.currentTrick))).toContain(a.cardId);
  });

  it('plays legal cards through whole games', () => {
    for (let seed = 1; seed <= 4; seed++) {
      const bots = [0, 1, 2, 3].map((s) => createHardBot(seed * 10 + s));
      let s: GameState = createGame(settings(), seed);
      while (s.phase !== 'GAME_OVER') {
        if (s.phase === 'DEAL_FIRST') s = applyAction(s, { type: 'START_ROUND' });
        else if (s.phase === 'DEAL_SECOND') s = applyAction(s, { type: 'DEAL_SECOND' });
        else if (s.phase === 'ROUND_END') s = applyAction(s, { type: 'NEXT_ROUND' });
        else if (s.phase === 'CHOOSE_TRUMP') {
          const seat = s.round.trumpChooser;
          const v: PlayerView = getPlayerView(s, seat);
          s = applyAction(s, { type: 'CHOOSE_TRUMP', seat, suit: bots[seat]!.chooseTrump(v) });
        } else {
          const seat = s.round.turn;
          const { cardId } = bots[seat]!.chooseCard(getPlayerView(s, seat));
          s = applyAction(s, { type: 'PLAY_CARD', seat, cardId }); // throws if illegal
        }
      }
      expect(Math.max(...s.scores)).toBeGreaterThanOrEqual(10);
    }
  });
});
