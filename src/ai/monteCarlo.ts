// Monte Carlo check for the Hard bot (SPEC §4.5). Samples deals of the hidden cards that are
// consistent with the known voids and hand counts, plays each candidate card out to the end of the
// round with the heuristic policy for all four seats, and averages my team's tricks.
//
// Pure and deterministic: all randomness comes from the Rng passed in.
import { createDeck } from '../engine/deck';
import { randomInt, shuffle, type Rng } from '../engine/rng';
import { getTrickWinner, ledSuit, nextSeat, teamOf } from '../engine/rules';
import type { Card, CardId, Hands, PlayerView, Seat, Trick } from '../engine/types';
import { buildTracker, cloneTracker, isVoid, trackPlay, type CardTracker } from './cardTracker';
import { chooseHeuristicCard } from './heuristicBot';

export const MC_SAMPLES = 40;
const MAX_DEAL_ATTEMPTS = 20;
const TRICKS_PER_ROUND = 8;

/** Cards nobody has played and that are not in my hand. */
export function unknownCards(view: PlayerView): Card[] {
  const seen = new Set<CardId>(view.hand.map((c) => c.id));
  for (const trick of [...view.completedTricks, view.currentTrick]) {
    for (const play of trick.plays) seen.add(play.card.id);
  }
  return createDeck().filter((c) => !seen.has(c.id));
}

function tryDeal(
  view: PlayerView,
  cards: readonly Card[],
  tracker: CardTracker,
  rng: Rng,
  respectVoids: boolean,
): Hands | null {
  const hands: Hands = [[], [], [], []];
  hands[view.seat] = [...view.hand];
  const others = ([0, 1, 2, 3] as const).filter((s) => s !== view.seat);
  const room = [0, 0, 0, 0];
  for (const s of others) room[s] = view.handCounts[s];

  const eligible = (card: Card): Seat[] =>
    others.filter((s) => !respectVoids || !isVoid(tracker, s, card.suit));
  // Most constrained cards first, so a void never leaves a card with nowhere to go late on.
  const ordered = shuffle(cards, rng)
    .map((card) => ({ card, options: eligible(card).length }))
    .sort((a, b) => a.options - b.options);

  for (const { card } of ordered) {
    const seats = eligible(card).filter((s) => (room[s] ?? 0) > 0);
    const total = seats.reduce<number>((sum, s) => sum + (room[s] ?? 0), 0);
    if (total === 0) return null;
    // Weighted by remaining room, so bigger hands get proportionally more cards.
    let pick = randomInt(rng, total);
    let chosen = seats[0] as Seat;
    for (const s of seats) {
      pick -= room[s] ?? 0;
      if (pick < 0) {
        chosen = s;
        break;
      }
    }
    hands[chosen].push(card);
    room[chosen] = (room[chosen] ?? 0) - 1;
  }
  return hands;
}

/**
 * One random deal of the hidden cards, consistent with every seat's hand count and (when possible)
 * the known voids. My own hand is copied in unchanged.
 */
export function sampleDeal(view: PlayerView, tracker: CardTracker, rng: Rng): Hands {
  const cards = unknownCards(view);
  for (let attempt = 0; attempt < MAX_DEAL_ATTEMPTS; attempt++) {
    const deal = tryDeal(view, cards, tracker, rng, true);
    if (deal) return deal;
  }
  const relaxed = tryDeal(view, cards, tracker, rng, false);
  if (!relaxed) throw new Error('sampleDeal: hand counts do not match the unknown cards');
  return relaxed;
}

/**
 * Plays the rest of the round from `view`'s position, starting with `first`, with the heuristic
 * policy for every seat. Returns my team's total tricks for the round.
 */
export function playout(
  view: PlayerView,
  deal: Hands,
  first: Card,
  baseTracker: CardTracker,
): number {
  const tracker = cloneTracker(baseTracker);
  const hands: Hands = [[...deal[0]], [...deal[1]], [...deal[2]], [...deal[3]]];
  const won: [number, number] = [view.tricksWon[0], view.tricksWon[1]];
  let trick: Trick = { leader: view.currentTrick.leader, plays: [...view.currentTrick.plays] };
  let completed = view.completedTricks.length;
  let turn: Seat = view.seat;

  const play = (seat: Seat, card: Card): void => {
    const hand = hands[seat];
    const i = hand.findIndex((c) => c.id === card.id);
    if (i < 0) throw new Error(`playout: ${card.id} is not in the hand of seat ${seat}`);
    hand.splice(i, 1);
    trackPlay(tracker, { seat, card }, ledSuit(trick));
    trick = { leader: trick.leader, plays: [...trick.plays, { seat, card }] };
    if (trick.plays.length === 4) {
      const winner = getTrickWinner(trick, view.trump);
      won[teamOf(winner)]++;
      completed++;
      trick = { leader: winner, plays: [] };
      turn = winner;
    } else {
      turn = nextSeat(seat);
    }
  };

  play(view.seat, first);
  while (completed < TRICKS_PER_ROUND) {
    const seat = turn;
    const seatView: PlayerView = {
      ...view,
      seat,
      hand: hands[seat],
      handCounts: [hands[0].length, hands[1].length, hands[2].length, hands[3].length],
      turn: seat,
      currentTrick: trick,
      // The tracker carries all public history; the policy does not read completedTricks.
      completedTricks: [],
      tricksWon: won,
    };
    const { cardId } = chooseHeuristicCard(seatView, tracker);
    const card = hands[seat].find((c) => c.id === cardId);
    if (!card) throw new Error(`playout: the policy chose ${cardId}, which is not in hand`);
    play(seat, card);
  }
  return won[teamOf(view.seat)];
}

/** Average tricks for my team after playing each candidate, over `samples` shared random deals. */
export function monteCarloScores(
  view: PlayerView,
  candidates: readonly Card[],
  rng: Rng,
  samples: number = MC_SAMPLES,
): Map<CardId, number> {
  const tracker = buildTracker(view, 'full');
  const totals = new Map<CardId, number>(candidates.map((c) => [c.id, 0]));
  for (let i = 0; i < samples; i++) {
    const deal = sampleDeal(view, tracker, rng);
    for (const card of candidates) {
      totals.set(card.id, (totals.get(card.id) ?? 0) + playout(view, deal, card, tracker));
    }
  }
  const averages = new Map<CardId, number>();
  for (const [id, total] of totals) averages.set(id, total / samples);
  return averages;
}
