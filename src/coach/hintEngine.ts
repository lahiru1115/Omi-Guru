// getHint and getTrumpHint (SPEC §5.1, §5.5). The coach uses the explainable heuristic policy with
// full card tracking, never Monte Carlo, so every suggestion has a reason a beginner can follow.
// It only ever sees the human's PlayerView.
import type { Decision } from '../ai/bot';
import { buildTracker } from '../ai/cardTracker';
import { chooseHeuristicCard } from '../ai/heuristicBot';
import { highCardPoints, scoreSuits, type SuitScore } from '../ai/trumpChooser';
import { rankValue } from '../engine/cards';
import type { CardId, PlayerView, Suit } from '../engine/types';

export type Hint = Decision;

export type TrumpHint = {
  suit: Suit;
  count: number;
  /** A, K, Q and J of the suggested suit, highest first. */
  highCards: CardId[];
  /** Every suit's score, best first, so the learner sees why. */
  ranking: SuitScore[];
};

export function getHint(view: PlayerView): Hint {
  return chooseHeuristicCard(view, buildTracker(view, 'full'));
}

/** Call in CHOOSE_TRUMP, when the view's hand holds the first 4 cards. */
export function getTrumpHint(view: PlayerView): TrumpHint {
  const ranking = scoreSuits(view.hand);
  const best = ranking[0];
  if (!best) throw new Error('getTrumpHint: empty ranking');
  const highCards = view.hand
    .filter((c) => c.suit === best.suit && highCardPoints(c) > 0)
    .sort((a, b) => rankValue(b.rank) - rankValue(a.rank))
    .map((c) => c.id);
  return { suit: best.suit, count: best.count, highCards, ranking };
}
