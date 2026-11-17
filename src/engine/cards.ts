// Card helpers: suits, ranks, rank order and card ids like "AS" and "10H". See SPEC §2.1, §3.
import type { Card, CardId, Rank, Suit } from './types';

export const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];

/** High to low: A > K > Q > J > 10 > 9 > 8 > 7. */
export const RANKS: readonly Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'];

/** Higher number = stronger card. A = 7, 7 = 0. */
export function rankValue(rank: Rank): number {
  return RANKS.length - 1 - RANKS.indexOf(rank);
}

/** Positive if a outranks b, negative if b outranks a, 0 if equal rank. */
export function compareRank(a: Card, b: Card): number {
  return rankValue(a.rank) - rankValue(b.rank);
}

export function makeCard(rank: Rank, suit: Suit): Card {
  return { id: `${rank}${suit}`, rank, suit };
}

function isSuit(value: string): value is Suit {
  return (SUITS as readonly string[]).includes(value);
}

function isRank(value: string): value is Rank {
  return (RANKS as readonly string[]).includes(value);
}

export function isCardId(value: unknown): value is CardId {
  if (typeof value !== 'string' || value.length < 2) return false;
  return isRank(value.slice(0, -1)) && isSuit(value.slice(-1));
}

/** Parses a card id like "10H". Throws on an invalid id. */
export function cardFromId(id: string): Card {
  if (!isCardId(id)) throw new Error(`Invalid card id: ${id}`);
  const rank = id.slice(0, -1);
  const suit = id.slice(-1);
  if (!isRank(rank) || !isSuit(suit)) throw new Error(`Invalid card id: ${id}`);
  return makeCard(rank, suit);
}
