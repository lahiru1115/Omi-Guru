// The Bot interface (SPEC §4). Bots receive only a PlayerView, never the full GameState, so they
// cannot see other players' hidden cards (CLAUDE.md rule 3).
import type { CardId, PlayerView, Suit } from '../engine/types';

/** Why a card was chosen (SPEC §5.2). The coach shows the matching text. */
export type ReasonCode =
  | 'ONLY_LEGAL'
  | 'PARTNER_WINNING'
  | 'WIN_CHEAPLY'
  | 'CASH_MASTER'
  | 'DRAW_TRUMPS'
  | 'RUFF'
  | 'OVERRUFF'
  | 'DISCARD_LOW'
  | 'SECOND_HAND_LOW'
  | 'LEAD_PARTNER_VOID'
  | 'LEAD_LONG_SUIT'
  | 'SAVE_TRUMP'
  | 'AVOID_OPPONENT_RUFF';

export type Decision = { cardId: CardId; reasons: ReasonCode[] };

export interface Bot {
  /** Called in CHOOSE_TRUMP, when the view's hand holds only the first 4 cards. */
  chooseTrump(view: PlayerView): Suit;
  /** Called in PLAYING on this bot's turn. Must return a legal card. */
  chooseCard(view: PlayerView): Decision;
}
