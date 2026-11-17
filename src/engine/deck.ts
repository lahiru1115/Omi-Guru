// The 32-card deck and dealing in two blocks of 4, starting from next(dealer). See SPEC §2.2.
import { makeCard, RANKS, SUITS } from './cards';
import { nextSeat } from './rules';
import type { Card, Hands, Seat } from './types';

export const DECK_SIZE = 32;
export const BLOCK_SIZE = 4;

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => makeCard(rank, suit)));
}

function emptyHands(): Hands {
  return [[], [], [], []];
}

/**
 * Deals a 32-card deck as the SPEC describes: a block of 4 to each player starting with next(dealer)
 * (the dealer is last), then a second block of 4 in the same order.
 */
export function dealBlocks(deck: readonly Card[], dealer: Seat): { first: Hands; second: Hands } {
  if (deck.length !== DECK_SIZE) throw new Error(`dealBlocks: expected ${DECK_SIZE} cards`);
  const first = emptyHands();
  const second = emptyHands();
  let pos = 0;
  for (const block of [first, second]) {
    let seat = nextSeat(dealer);
    for (let i = 0; i < 4; i++) {
      block[seat] = deck.slice(pos, pos + BLOCK_SIZE);
      pos += BLOCK_SIZE;
      seat = nextSeat(seat);
    }
  }
  return { first, second };
}
