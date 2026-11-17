// Easy bot (SPEC §4.3): a random legal card, and trumps = the suit it holds most of (SPEC §4.2).
//
// The bot is stateless: each decision seeds the RNG from the bot's seed mixed with a fingerprint of
// the view. The same game therefore always plays out the same way, even after save and Continue.
import { compareRank, SUITS } from '../engine/cards';
import { mulberry32, randomInt } from '../engine/rng';
import { getLegalCards } from '../engine/rules';
import type { Card, Suit } from '../engine/types';
import type { Bot, Decision } from './bot';
import { decisionSeed } from './viewSeed';

/** The suit with the most cards; a tie goes to the suit with the higher top card. */
export function longestSuit(hand: readonly Card[]): Suit {
  let best: { suit: Suit; count: number; top: Card | undefined } | null = null;
  for (const suit of SUITS) {
    const cards = hand.filter((c) => c.suit === suit);
    const top = cards.reduce<Card | undefined>(
      (hi, c) => (hi === undefined || compareRank(c, hi) > 0 ? c : hi),
      undefined,
    );
    const better =
      best === null ||
      cards.length > best.count ||
      (cards.length === best.count &&
        top !== undefined &&
        (best.top === undefined || compareRank(top, best.top) > 0));
    if (better) best = { suit, count: cards.length, top };
  }
  return best?.suit ?? 'S';
}

export function createEasyBot(seed: number): Bot {
  return {
    chooseTrump(view) {
      return longestSuit(view.hand);
    },
    chooseCard(view): Decision {
      const legal = getLegalCards(view.hand, view.currentTrick);
      if (legal.length === 0) throw new Error('Easy bot: no legal card (empty hand?)');
      const rng = mulberry32(decisionSeed(seed, view));
      const card = legal[randomInt(rng, legal.length)] as Card;
      return { cardId: card.id, reasons: legal.length === 1 ? ['ONLY_LEGAL'] : [] };
    },
  };
}
