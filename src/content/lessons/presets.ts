// Helpers for writing lesson data. Pure functions, no React or storage.
import { RANKS, SUITS } from '../../engine/cards';
import type { CardId, RoundPreset, Seat, Suit } from '../../engine/types';
import type { PlayStep } from './types';

/**
 * Builds a full 32-card preset from partial hands: each seat keeps the cards given (in order; the
 * first 4 are its first block) and is then filled up to 8 with the unused cards in deck order.
 * Use it when only some cards matter (e.g. the 4 cards for a trump choice).
 */
export function fillPreset(
  dealer: Seat,
  partial: [CardId[], CardId[], CardId[], CardId[]],
  trump?: Suit,
): RoundPreset {
  const used = new Set(partial.flat());
  if (used.size !== partial.flat().length) throw new Error('fillPreset: a card is listed twice');
  const spare: CardId[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const id: CardId = `${rank}${suit}`;
      if (!used.has(id)) spare.push(id);
    }
  }
  const hands = partial.map((cards) => {
    const hand = [...cards];
    while (hand.length < 8) {
      const next = spare.shift();
      if (!next) throw new Error('fillPreset: not enough cards');
      hand.push(next);
    }
    return hand;
  }) as RoundPreset['hands'];
  return trump === undefined ? { dealer, hands } : { dealer, hands, trump };
}

/** A bot's scripted play (seats 1–3). */
export function botPlay(seat: 1 | 2 | 3, cardId: CardId, textKey?: PlayStep['textKey']): PlayStep {
  return textKey ? { type: 'play', seat, cardId, textKey } : { type: 'play', seat, cardId };
}
