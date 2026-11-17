// Card tracker (SPEC §4.1): what a player can know from public information plus their own hand.
// - The cards already played.
// - Voids: a player who failed to follow a suit has none of that suit left.
// - The master card of a suit: the highest card of that suit not yet played.
// - Trumps remaining, and trumps not in my hand.
//
// The tracker holds only public knowledge, so Monte Carlo playouts can share one tracker for all four
// seats; the hand is passed separately where it matters.
//
// Two modes:
// - 'full' (Hard bot, coach): remembers every played card and every void.
// - 'basic' (Medium, "without voids or master tracking"): remembers only the cards in the current
//   trick and never records voids. Its idea of a master is therefore the highest card it has not seen,
//   e.g. it thinks the Ace is still out even after the Ace was played in an earlier trick.
import { RANKS } from '../engine/cards';
import { ledSuit } from '../engine/rules';
import type { Card, CardId, Play, PlayerView, Seat, Suit } from '../engine/types';

export type TrackerMode = 'full' | 'basic';

export type CardTracker = {
  mode: TrackerMode;
  trump: Suit | null;
  played: Set<CardId>;
  voids: [Set<Suit>, Set<Suit>, Set<Suit>, Set<Suit>];
};

export function createTracker(mode: TrackerMode, trump: Suit | null): CardTracker {
  return { mode, trump, played: new Set(), voids: [new Set(), new Set(), new Set(), new Set()] };
}

/** Records one play. `led` is the suit led in that trick (null when this play leads it). */
export function trackPlay(tracker: CardTracker, play: Play, led: Suit | null): void {
  tracker.played.add(play.card.id);
  if (tracker.mode === 'full' && led !== null && play.card.suit !== led) {
    tracker.voids[play.seat].add(led);
  }
}

/** Builds the tracker from a PlayerView (public tricks only). */
export function buildTracker(view: PlayerView, mode: TrackerMode): CardTracker {
  const tracker = createTracker(mode, view.trump);
  const tricks =
    mode === 'full' ? [...view.completedTricks, view.currentTrick] : [view.currentTrick];
  for (const trick of tricks) {
    const led = ledSuit(trick);
    trick.plays.forEach((play, i) => trackPlay(tracker, play, i === 0 ? null : led));
  }
  return tracker;
}

export function cloneTracker(tracker: CardTracker): CardTracker {
  return {
    mode: tracker.mode,
    trump: tracker.trump,
    played: new Set(tracker.played),
    voids: [
      new Set(tracker.voids[0]),
      new Set(tracker.voids[1]),
      new Set(tracker.voids[2]),
      new Set(tracker.voids[3]),
    ],
  };
}

export function isVoid(tracker: CardTracker, seat: Seat, suit: Suit): boolean {
  return tracker.voids[seat].has(suit);
}

/** The highest card of `suit` not yet played (as far as this tracker knows), or null if none left. */
export function masterOf(tracker: CardTracker, suit: Suit): CardId | null {
  for (const rank of RANKS) {
    const id: CardId = `${rank}${suit}`;
    if (!tracker.played.has(id)) return id;
  }
  return null;
}

/** True if no unplayed card of the same suit ranks above `card`. */
export function isMaster(tracker: CardTracker, card: Card): boolean {
  for (const rank of RANKS) {
    if (rank === card.rank) return true;
    if (!tracker.played.has(`${rank}${card.suit}`)) return false;
  }
  return false;
}

/** How many cards of `suit` have been played (as far as this tracker knows). */
export function playedCount(tracker: CardTracker, suit: Suit): number {
  let n = 0;
  for (const rank of RANKS) if (tracker.played.has(`${rank}${suit}`)) n++;
  return n;
}

/** Trumps not yet played (8 minus trumps played). 0 when there is no trump. */
export function trumpsRemaining(tracker: CardTracker): number {
  return tracker.trump === null ? 0 : RANKS.length - playedCount(tracker, tracker.trump);
}

/** Unplayed trumps that are not in my hand, so some other player may hold them. */
export function trumpsOutsideHand(tracker: CardTracker, hand: readonly Card[]): number {
  if (tracker.trump === null) return 0;
  const mine = hand.filter((c) => c.suit === tracker.trump).length;
  return trumpsRemaining(tracker) - mine;
}
