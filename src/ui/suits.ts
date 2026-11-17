// Display helpers for suits and seats. Text still comes from i18n; this only maps codes to keys.
import type { MessageKey } from '../content/i18n/t';
import type { Seat, Suit } from '../engine/types';

/** U+FE0E keeps iOS from drawing the suit symbols as emoji. */
export const SUIT_SYMBOL: Readonly<Record<Suit, string>> = {
  S: '♠︎',
  H: '♥︎',
  D: '♦︎',
  C: '♣︎',
};

export const SUIT_KEY = {
  S: 'suit.S',
  H: 'suit.H',
  D: 'suit.D',
  C: 'suit.C',
} as const satisfies Record<Suit, MessageKey>;

/** CSS colour class for a suit, honouring the optional 4-colour deck (SPEC §8.3). */
export function suitColorClass(suit: Suit, fourColor: boolean): string {
  if (fourColor && suit === 'D') return 'suit--blue';
  if (fourColor && suit === 'C') return 'suit--green';
  return suit === 'H' || suit === 'D' ? 'suit--red' : 'suit--black';
}

/** Screen position of each seat (CLAUDE.md seat model). */
export const SEAT_POSITION: Readonly<Record<Seat, 'bottom' | 'right' | 'top' | 'left'>> = {
  0: 'bottom',
  1: 'right',
  2: 'top',
  3: 'left',
};
