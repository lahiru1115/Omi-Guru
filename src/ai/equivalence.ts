// Equivalent cards (SPEC §5.1): cards of the same suit that are adjacent once played cards are
// removed count as the same card. Cards in my own hand also close the gap: holding 8♣ and 7♣,
// playing either is equally good, and with 9♣ played, 10♣ and 8♣ are equivalent too.
import { RANKS } from '../engine/cards';
import type { Card, CardId, PlayerView } from '../engine/types';

/** Cards that are no longer "in play" for anyone else: played cards plus my hand. */
export function knownCards(view: PlayerView): Set<CardId> {
  const known = new Set<CardId>(view.hand.map((c) => c.id));
  for (const trick of [...view.completedTricks, view.currentTrick]) {
    for (const play of trick.plays) known.add(play.card.id);
  }
  return known;
}

export function areEquivalent(
  a: Card,
  b: Card,
  view: PlayerView,
  known: Set<CardId> = knownCards(view),
): boolean {
  if (a.suit !== b.suit) return false;
  if (a.id === b.id) return true;
  const ia = RANKS.indexOf(a.rank);
  const ib = RANKS.indexOf(b.rank);
  for (let i = Math.min(ia, ib) + 1; i < Math.max(ia, ib); i++) {
    const rank = RANKS[i];
    if (rank === undefined) continue;
    // A card between them that someone else may still hold makes them different.
    if (!known.has(`${rank}${a.suit}`)) return false;
  }
  return true;
}

/** Splits cards into groups of equivalent cards, keeping the input order of the first members. */
export function groupEquivalent(cards: readonly Card[], view: PlayerView): Card[][] {
  const known = knownCards(view);
  const groups: Card[][] = [];
  for (const card of cards) {
    const group = groups.find((g) => g[0] !== undefined && areEquivalent(g[0], card, view, known));
    if (group) group.push(card);
    else groups.push([card]);
  }
  return groups;
}
