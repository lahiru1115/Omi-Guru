// Hand order for display (SPEC §8.2): trump suit first, then the other suits arranged so colours
// alternate as much as possible, and high to low within each suit. Pure, so it is unit tested.
import { compareRank } from '../engine/cards';
import type { Card, Suit } from '../engine/types';

const BASE_ORDER: readonly Suit[] = ['S', 'H', 'C', 'D'];

export function isRedSuit(suit: Suit): boolean {
  return suit === 'H' || suit === 'D';
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  );
}

function sameColourPairs(order: readonly Suit[]): number {
  let pairs = 0;
  for (let i = 1; i < order.length; i++) {
    if (isRedSuit(order[i] as Suit) === isRedSuit(order[i - 1] as Suit)) pairs++;
  }
  return pairs;
}

/** The display order of the suits present in the hand. */
export function suitOrder(hand: readonly Card[], trump: Suit | null): Suit[] {
  const present = BASE_ORDER.filter((s) => hand.some((c) => c.suit === s));
  const lead = trump !== null && present.includes(trump) ? [trump] : [];
  const rest = present.filter((s) => s !== trump);
  // permutations() keeps BASE_ORDER order first, so ties resolve to the most natural order.
  let best: Suit[] = [...lead, ...rest];
  let bestPairs = sameColourPairs(best);
  for (const perm of permutations(rest)) {
    const order = [...lead, ...perm];
    const pairs = sameColourPairs(order);
    if (pairs < bestPairs) {
      best = order;
      bestPairs = pairs;
    }
  }
  return best;
}

export function sortHand(hand: readonly Card[], trump: Suit | null): Card[] {
  const order = suitOrder(hand, trump);
  return [...hand].sort((a, b) => {
    const bySuit = order.indexOf(a.suit) - order.indexOf(b.suit);
    return bySuit !== 0 ? bySuit : compareRank(b, a);
  });
}
