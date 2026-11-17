// The heuristic policy for Medium and Hard bots and for the coach (SPEC §4.4). Every branch returns
// reason codes, so the coach can explain the choice. Medium uses a 'basic' tracker (no voids, no
// memory of earlier tricks); Hard and the coach use a 'full' tracker.
import { rankValue, SUITS } from '../engine/cards';
import { getLegalCards, teamOf } from '../engine/rules';
import type { Card, PlayerView, Seat, Suit } from '../engine/types';
import type { Bot, Decision, ReasonCode } from './bot';
import {
  buildTracker,
  isMaster,
  isVoid,
  trumpsOutsideHand,
  type CardTracker,
  type TrackerMode,
} from './cardTracker';
import {
  highest,
  lowest,
  opponentsOf,
  partnerOf,
  suitCount,
  winningPlay,
  winsIfPlayed,
} from './handHelpers';
import { chooseTrumpSuit } from './trumpChooser';

type Ctx = {
  view: PlayerView;
  tracker: CardTracker;
  hand: readonly Card[];
  seat: Seat;
  partner: Seat;
  opponents: [Seat, Seat];
  trump: Suit | null;
};

function decide(card: Card | undefined, reasons: ReasonCode[]): Decision {
  if (!card) throw new Error('heuristic bot: no card to play');
  return { cardId: card.id, reasons };
}

function opponentVoidIn(ctx: Ctx, suit: Suit): boolean {
  return ctx.opponents.some((o) => isVoid(ctx.tracker, o, suit));
}

function topValue(card: Card | undefined): number {
  return card === undefined ? -1 : rankValue(card.rank);
}

/** The suit with the most cards among `cards`; a tie goes to the suit with the higher top card. */
function longestSuitOf(cards: readonly Card[]): Suit | null {
  let best: { suit: Suit; count: number; top: Card | undefined } | null = null;
  for (const suit of SUITS) {
    const inSuit = cards.filter((c) => c.suit === suit);
    if (inSuit.length === 0) continue;
    const top = highest(inSuit);
    if (
      best === null ||
      inSuit.length > best.count ||
      (inSuit.length === best.count && topValue(top) > topValue(best.top))
    ) {
      best = { suit, count: inSuit.length, top };
    }
  }
  return best?.suit ?? null;
}

// ---------------------------------------------------------------------------------------------
// Leading a trick

function lead(ctx: Ctx): Decision {
  const { hand, trump, tracker, view, partner } = ctx;
  const nonTrumps = hand.filter((c) => c.suit !== trump);
  const trumps = hand.filter((c) => c.suit === trump);

  // 1. Cash a master of a non-trump suit that no opponent is known to be void in.
  const masters = nonTrumps.filter((c) => isMaster(tracker, c) && !opponentVoidIn(ctx, c.suit));
  if (masters.length > 0) {
    // Prefer the master from the suit I hold most of (it sets up my other cards there).
    const suit = longestSuitOf(masters.flatMap((m) => hand.filter((c) => c.suit === m.suit)));
    return decide(
      masters.find((m) => m.suit === suit),
      ['CASH_MASTER'],
    );
  }

  // 2. My team chose trumps and I hold 4+ trumps: draw trumps (while any are still out).
  if (
    trump !== null &&
    teamOf(view.trumpChooser) === teamOf(ctx.seat) &&
    trumps.length >= 4 &&
    trumpsOutsideHand(tracker, hand) > 0
  ) {
    return decide(highest(trumps), ['DRAW_TRUMPS']);
  }

  // 3. Partner is void in a suit, opponents are not, and trumps are still out: lead it low.
  if (trump !== null && !isVoid(tracker, partner, trump) && trumpsOutsideHand(tracker, hand) > 0) {
    for (const suit of SUITS) {
      if (suit === trump || !isVoid(tracker, partner, suit) || opponentVoidIn(ctx, suit)) continue;
      const cards = nonTrumps.filter((c) => c.suit === suit);
      if (cards.length > 0) return decide(lowest(cards, hand), ['LEAD_PARTNER_VOID']);
    }
  }

  // 4 + 5. Lead low from my longest non-trump suit, avoiding suits an opponent can ruff.
  if (nonTrumps.length === 0) return decide(lowest(trumps, hand), ['LEAD_LONG_SUIT']);
  const safe = nonTrumps.filter((c) => !opponentVoidIn(ctx, c.suit));
  const longestAll = longestSuitOf(nonTrumps);
  if (safe.length > 0) {
    const suit = longestSuitOf(safe);
    const card = lowest(
      safe.filter((c) => c.suit === suit),
      hand,
    );
    return decide(
      card,
      suit === longestAll ? ['LEAD_LONG_SUIT'] : ['LEAD_LONG_SUIT', 'AVOID_OPPONENT_RUFF'],
    );
  }
  // Every non-trump suit I hold can be ruffed: lead a low trump if I have one.
  if (trumps.length > 0) return decide(lowest(trumps, hand), ['AVOID_OPPONENT_RUFF']);
  return decide(
    lowest(
      nonTrumps.filter((c) => c.suit === longestAll),
      hand,
    ),
    ['LEAD_LONG_SUIT'],
  );
}

// ---------------------------------------------------------------------------------------------
// Following

/**
 * Partner is winning and will probably keep the trick: I'm last, or partner's card is the master
 * and nobody still to play is known to be able to ruff it.
 */
function partnerLikelyKeeps(ctx: Ctx, partnerCard: Card, position: number): boolean {
  if (position === 3) return true;
  const { tracker, trump, view } = ctx;
  if (!isMaster(tracker, partnerCard)) return false;
  if (partnerCard.suit === trump) return true; // the highest trump outstanding
  // Partner holds the master of the led suit. Was the trick trumped already? Then partner isn't winning.
  const led = view.currentTrick.plays[0]?.card.suit;
  if (led === undefined || trump === null) return true;
  // The only player after me is the next opponent (partner can only be winning at position 2 or 3).
  const after = ctx.opponents[0];
  return !(isVoid(tracker, after, led) && !isVoid(tracker, after, trump));
}

function follow(ctx: Ctx, legal: Card[]): Decision {
  const { view, hand, trump, seat, partner, tracker } = ctx;
  const trick = view.currentTrick;
  const position = trick.plays.length;
  const winner = winningPlay(trick, trump);
  const partnerWinning = winner.seat === partner;
  const winners = legal.filter((c) => winsIfPlayed(trick, seat, c, trump));

  // 2. Partner is winning and will keep it: play low.
  if (partnerWinning && partnerLikelyKeeps(ctx, winner.card, position)) {
    return decide(lowest(legal, hand), ['PARTNER_WINNING']);
  }
  // 3. Last to play and can win: the cheapest winner.
  if (position === 3 && winners.length > 0) {
    return decide(lowest(winners, hand), ['WIN_CHEAPLY']);
  }
  // 4. Second to play: the master if I have it, otherwise low.
  if (position === 1) {
    const master = winners.find((c) => isMaster(tracker, c));
    if (master) return decide(master, ['CASH_MASTER']);
    return decide(lowest(legal, hand), ['SECOND_HAND_LOW']);
  }
  // 5. Third to play: the lowest card that beats the current winner.
  if (position === 2 && winners.length > 0) {
    return decide(lowest(winners, hand), ['WIN_CHEAPLY']);
  }
  // 6. Otherwise, play low.
  return decide(lowest(legal, hand), ['DISCARD_LOW']);
}

/** The least useful non-trump cards: never a master (unless only masters are left). */
function discardCandidates(ctx: Ctx): Card[] {
  const nonTrumps = ctx.hand.filter((c) => c.suit !== ctx.trump);
  const nonMasters = nonTrumps.filter((c) => !isMaster(ctx.tracker, c));
  return nonMasters.length > 0 ? nonMasters : nonTrumps;
}

/** The lowest card of my weakest suit among `cards` (lowest top card, then fewer cards). */
function lowestOfWeakestSuit(cards: readonly Card[], hand: readonly Card[]): Card | undefined {
  let bestSuit: Suit | null = null;
  let bestTop: Card | undefined;
  for (const suit of SUITS) {
    const inSuit = cards.filter((c) => c.suit === suit);
    if (inSuit.length === 0) continue;
    const top = highest(inSuit);
    if (top === undefined) continue;
    if (
      bestSuit === null ||
      topValue(top) < topValue(bestTop) ||
      (topValue(top) === topValue(bestTop) && suitCount(hand, suit) < suitCount(hand, bestSuit))
    ) {
      bestSuit = suit;
      bestTop = top;
    }
  }
  return lowest(
    cards.filter((c) => c.suit === bestSuit),
    hand,
  );
}

function cannotFollow(ctx: Ctx): Decision {
  const { view, hand, trump, seat, partner } = ctx;
  const trick = view.currentTrick;
  const position = trick.plays.length;
  const winner = winningPlay(trick, trump);
  const trumps = hand.filter((c) => c.suit === trump);
  const discards = discardCandidates(ctx);

  // 1. Partner is winning and will keep it: throw my least useful card.
  if (winner.seat === partner && partnerLikelyKeeps(ctx, winner.card, position)) {
    const card = discards.length > 0 ? lowestOfWeakestSuit(discards, hand) : lowest(trumps, hand);
    return decide(card, ['PARTNER_WINNING']);
  }
  if (winner.seat !== partner && trumps.length > 0) {
    // 2. An opponent is winning without a trump: ruff with my lowest trump.
    if (winner.card.suit !== trump) return decide(lowest(trumps, hand), ['RUFF']);
    // 3. An opponent is winning with a trump: overruff with the lowest trump that beats it.
    const over = trumps.filter((c) => winsIfPlayed(trick, seat, c, trump));
    if (over.length > 0) return decide(lowest(over, hand), ['OVERRUFF']);
  }
  // 4. Discard low and keep trumps and masters.
  if (discards.length > 0) {
    return decide(
      lowest(discards, hand),
      trumps.length > 0 ? ['DISCARD_LOW', 'SAVE_TRUMP'] : ['DISCARD_LOW'],
    );
  }
  return decide(lowest(trumps, hand), ['DISCARD_LOW']);
}

// ---------------------------------------------------------------------------------------------

/** The heuristic decision for the player whose view this is. `tracker` must match the view. */
export function chooseHeuristicCard(view: PlayerView, tracker: CardTracker): Decision {
  const legal = getLegalCards(view.hand, view.currentTrick);
  if (legal.length === 0) throw new Error('heuristic bot: no legal card (empty hand?)');
  const ctx: Ctx = {
    view,
    tracker,
    hand: view.hand,
    seat: view.seat,
    partner: partnerOf(view.seat),
    opponents: opponentsOf(view.seat),
    trump: view.trump,
  };
  if (view.currentTrick.plays.length === 0) return lead(ctx);
  // 1. Only one legal card.
  if (legal.length === 1) return decide(legal[0], ['ONLY_LEGAL']);
  const led = view.currentTrick.plays[0]?.card.suit;
  const canFollow = legal.some((c) => c.suit === led);
  return canFollow ? follow(ctx, legal) : cannotFollow(ctx);
}

export function createHeuristicBot(mode: TrackerMode): Bot {
  return {
    chooseTrump(view) {
      return chooseTrumpSuit(view.hand);
    },
    chooseCard(view) {
      return chooseHeuristicCard(view, buildTracker(view, mode));
    },
  };
}
