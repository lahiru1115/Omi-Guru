// Seat helpers, getLegalCards and getTrickWinner. The single source of truth for play rules.
// See SPEC §2.3, §3.1 and the seat model in CLAUDE.md.
import { compareRank } from './cards';
import type { Card, Play, Seat, Suit, Team, Trick } from './types';

export const SEATS: readonly Seat[] = [0, 1, 2, 3];

/** The next seat in (anticlockwise) play order: CLAUDE.md's next(seat). */
export function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}

/** CLAUDE.md's team(seat): 0 = You + Partner, 1 = opponents. */
export function teamOf(seat: Seat): Team {
  return (seat % 2) as Team;
}

/** The suit led in a trick, or null if nobody has played yet. */
export function ledSuit(trick: Trick): Suit | null {
  return trick.plays[0]?.card.suit ?? null;
}

/** Cards the player may play: must follow the led suit if possible, otherwise anything. */
export function getLegalCards(hand: readonly Card[], trick: Trick): Card[] {
  const suit = ledSuit(trick);
  if (suit === null) return [...hand];
  const following = hand.filter((c) => c.suit === suit);
  return following.length > 0 ? following : [...hand];
}

/**
 * The seat winning the trick: the highest trump, otherwise the highest card of the led suit.
 * Works on a partial trick too (returns the current winner). Throws on an empty trick.
 */
export function getTrickWinner(trick: Trick, trump: Suit | null): Seat {
  const first = trick.plays[0];
  if (!first) throw new Error('getTrickWinner: the trick has no plays');
  const led = first.card.suit;
  let best: Play = first;
  for (const play of trick.plays.slice(1)) {
    if (beats(play.card, best.card, led, trump)) best = play;
  }
  return best.seat;
}

function beats(challenger: Card, current: Card, led: Suit, trump: Suit | null): boolean {
  const challengerTrump = challenger.suit === trump;
  const currentTrump = current.suit === trump;
  if (challengerTrump !== currentTrump) return challengerTrump;
  if (challenger.suit !== current.suit) return false; // an off-suit discard never wins
  if (!challengerTrump && challenger.suit !== led) return false;
  return compareRank(challenger, current) > 0;
}
