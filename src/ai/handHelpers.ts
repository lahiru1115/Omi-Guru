// Small helpers shared by the heuristic policy, Monte Carlo and the coach. Rules come from the engine
// (getTrickWinner); nothing here re-implements them.
import { rankValue, SUITS } from '../engine/cards';
import { getTrickWinner } from '../engine/rules';
import type { Card, Seat, Suit, Trick } from '../engine/types';

export function partnerOf(seat: Seat): Seat {
  return ((seat + 2) % 4) as Seat;
}

export function opponentsOf(seat: Seat): [Seat, Seat] {
  return [((seat + 1) % 4) as Seat, ((seat + 3) % 4) as Seat];
}

export function suitCount(hand: readonly Card[], suit: Suit): number {
  let n = 0;
  for (const c of hand) if (c.suit === suit) n++;
  return n;
}

/**
 * The lowest card. Ties (same rank, different suits) go to the suit I hold fewer of, which moves
 * me towards a void, then to SUITS order so the choice is always deterministic.
 */
export function lowest(cards: readonly Card[], hand: readonly Card[] = cards): Card | undefined {
  let best: Card | undefined;
  for (const c of cards) {
    if (best === undefined) {
      best = c;
      continue;
    }
    const d = rankValue(c.rank) - rankValue(best.rank);
    if (d < 0) best = c;
    else if (d === 0) {
      const lenC = suitCount(hand, c.suit);
      const lenB = suitCount(hand, best.suit);
      if (lenC < lenB || (lenC === lenB && SUITS.indexOf(c.suit) < SUITS.indexOf(best.suit))) {
        best = c;
      }
    }
  }
  return best;
}

export function highest(cards: readonly Card[]): Card | undefined {
  let best: Card | undefined;
  for (const c of cards) {
    if (
      best === undefined ||
      rankValue(c.rank) > rankValue(best.rank) ||
      (rankValue(c.rank) === rankValue(best.rank) &&
        SUITS.indexOf(c.suit) < SUITS.indexOf(best.suit))
    ) {
      best = c;
    }
  }
  return best;
}

/** True if `seat` would be winning the trick right after playing `card` (engine rule). */
export function winsIfPlayed(trick: Trick, seat: Seat, card: Card, trump: Suit | null): boolean {
  const next: Trick = { leader: trick.leader, plays: [...trick.plays, { seat, card }] };
  return getTrickWinner(next, trump) === seat;
}

/** The play currently winning a non-empty trick. */
export function winningPlay(trick: Trick, trump: Suit | null): { seat: Seat; card: Card } {
  const seat = getTrickWinner(trick, trump);
  const play = trick.plays.find((p) => p.seat === seat);
  if (!play) throw new Error('winningPlay: winner has no play');
  return play;
}
