// Hard bot (SPEC §4.3, §4.5): the heuristic policy with full card tracking. From trick 4 onwards it
// also checks the candidates with a Monte Carlo simulation and switches card only when another card
// is more than 0.1 tricks better on average. Deterministic: the RNG is seeded per decision.
import { mulberry32 } from '../engine/rng';
import { getLegalCards } from '../engine/rules';
import type { Card, PlayerView } from '../engine/types';
import type { Bot, Decision } from './bot';
import { buildTracker } from './cardTracker';
import { groupEquivalent } from './equivalence';
import { lowest } from './handHelpers';
import { chooseHeuristicCard } from './heuristicBot';
import { MC_SAMPLES, monteCarloScores } from './monteCarlo';
import { chooseTrumpSuit } from './trumpChooser';
import { decisionSeed } from './viewSeed';

/** Monte Carlo starts at trick 4, i.e. once 3 tricks are complete. */
export const MC_FROM_COMPLETED_TRICKS = 3;
/** Keep the heuristic card if it is within this many tricks of the best. */
export const MC_TOLERANCE = 0.1;

export function chooseHardCard(view: PlayerView, seed: number, samples = MC_SAMPLES): Decision {
  const heuristic = chooseHeuristicCard(view, buildTracker(view, 'full'));
  if (view.completedTricks.length < MC_FROM_COMPLETED_TRICKS) return heuristic;

  const legal = getLegalCards(view.hand, view.currentTrick);
  const groups = groupEquivalent(legal, view);
  if (groups.length <= 1) return heuristic;

  // One representative per group of equivalent cards: the heuristic card for its group, otherwise
  // the group's lowest card.
  const candidates = groups.map(
    (group): Card =>
      group.find((c) => c.id === heuristic.cardId) ?? (lowest(group, view.hand) as Card),
  );
  const scores = monteCarloScores(view, candidates, mulberry32(decisionSeed(seed, view)), samples);

  let best: Card | undefined;
  let bestScore = -Infinity;
  for (const card of candidates) {
    const score = scores.get(card.id) ?? -Infinity;
    if (score > bestScore) {
      best = card;
      bestScore = score;
    }
  }
  const heuristicScore = scores.get(heuristic.cardId) ?? -Infinity;
  if (!best || heuristicScore >= bestScore - MC_TOLERANCE) return heuristic;
  return { cardId: best.id, reasons: [] };
}

export function createHardBot(seed: number): Bot {
  return {
    chooseTrump(view) {
      return chooseTrumpSuit(view.hand);
    },
    chooseCard(view) {
      return chooseHardCard(view, seed);
    },
  };
}
