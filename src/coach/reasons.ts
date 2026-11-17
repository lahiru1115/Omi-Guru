// Reason, mistake and verdict codes mapped to i18n keys (SPEC §5.2–§5.5), plus the raw params each
// message needs. The coach stays language-free: it returns a key and params (card ids and suits),
// and the UI turns them into text (see src/ui/coachText.ts).
import type { ReasonCode } from '../ai/bot';
import { buildTracker, isVoid } from '../ai/cardTracker';
import { opponentsOf } from '../ai/handHelpers';
import { cardFromId, SUITS } from '../engine/cards';
import { ledSuit } from '../engine/rules';
import type { CardId, PlayerView, Suit } from '../engine/types';
import type { MessageKey } from '../content/i18n/t';
import type { TrumpHint } from './hintEngine';
import { lowestWinner, type MistakeCode, type Verdict } from './review';

export const REASON_KEY = {
  ONLY_LEGAL: 'reason.ONLY_LEGAL',
  PARTNER_WINNING: 'reason.PARTNER_WINNING',
  WIN_CHEAPLY: 'reason.WIN_CHEAPLY',
  CASH_MASTER: 'reason.CASH_MASTER',
  DRAW_TRUMPS: 'reason.DRAW_TRUMPS',
  RUFF: 'reason.RUFF',
  OVERRUFF: 'reason.OVERRUFF',
  DISCARD_LOW: 'reason.DISCARD_LOW',
  SECOND_HAND_LOW: 'reason.SECOND_HAND_LOW',
  LEAD_PARTNER_VOID: 'reason.LEAD_PARTNER_VOID',
  LEAD_LONG_SUIT: 'reason.LEAD_LONG_SUIT',
  SAVE_TRUMP: 'reason.SAVE_TRUMP',
  AVOID_OPPONENT_RUFF: 'reason.AVOID_OPPONENT_RUFF',
} as const satisfies Record<ReasonCode, MessageKey>;

export const MISTAKE_KEY = {
  OVERTOOK_PARTNER: 'mistake.OVERTOOK_PARTNER',
  TRUMPED_PARTNER: 'mistake.TRUMPED_PARTNER',
  WASTED_HIGH_CARD: 'mistake.WASTED_HIGH_CARD',
  UNNECESSARY_TRUMP: 'mistake.UNNECESSARY_TRUMP',
  LED_INTO_RUFF: 'mistake.LED_INTO_RUFF',
  THREW_MASTER: 'mistake.THREW_MASTER',
  OVERPAID_WIN: 'mistake.OVERPAID_WIN',
} as const satisfies Record<MistakeCode, MessageKey>;

export const VERDICT_KEY = {
  GOOD: 'verdict.GOOD',
  OK: 'verdict.OK',
  BETTER_EXISTS: 'verdict.BETTER_EXISTS',
} as const satisfies Record<Verdict, MessageKey>;

export const TRUMP_HINT_KEY = 'trumpHint.text' satisfies MessageKey;
export const TRUMP_HINT_NO_HIGH_KEY = 'trumpHint.textNoHigh' satisfies MessageKey;

/** Raw message params. The UI formats `card`/`best`/`highCards` as card names and `suit` as a suit name. */
export type CoachParams = {
  card?: CardId;
  best?: CardId;
  suit?: Suit;
  count?: number;
  highCards?: CardId[];
};

export type CoachMessage = { key: MessageKey; params: CoachParams };

/** A suit I hold (not trumps) that an opponent is known to be void in. */
function opponentVoidSuit(view: PlayerView): Suit | undefined {
  const tracker = buildTracker(view, 'full');
  return SUITS.find(
    (suit) =>
      suit !== view.trump &&
      view.hand.some((c) => c.suit === suit) &&
      opponentsOf(view.seat).some((o) => isVoid(tracker, o, suit)),
  );
}

/** The message for a reason code, for the card `cardId` the coach suggests in `view`. */
export function reasonMessage(code: ReasonCode, view: PlayerView, cardId: CardId): CoachMessage {
  const card = cardFromId(cardId);
  const key = REASON_KEY[code];
  switch (code) {
    case 'WIN_CHEAPLY':
      return { key, params: { card: cardId } };
    case 'CASH_MASTER':
      return { key, params: { card: cardId, suit: card.suit } };
    case 'RUFF':
      return { key, params: { suit: ledSuit(view.currentTrick) ?? card.suit } };
    case 'LEAD_PARTNER_VOID':
      return { key, params: { suit: card.suit } };
    case 'AVOID_OPPONENT_RUFF':
      return { key, params: { suit: opponentVoidSuit(view) ?? card.suit } };
    default:
      return { key, params: {} };
  }
}

/** The message for a mistake made by playing `playedId` in `view` (the view before the play). */
export function mistakeMessage(
  code: MistakeCode,
  view: PlayerView,
  playedId: CardId,
): CoachMessage {
  const key = MISTAKE_KEY[code];
  switch (code) {
    case 'WASTED_HIGH_CARD':
    case 'THREW_MASTER':
      return { key, params: { card: playedId } };
    case 'LED_INTO_RUFF':
      return { key, params: { suit: cardFromId(playedId).suit } };
    case 'OVERPAID_WIN': {
      const best = lowestWinner(view)?.id;
      return { key, params: best ? { card: playedId, best } : { card: playedId } };
    }
    default:
      return { key, params: {} };
  }
}

export function verdictMessage(verdict: Verdict, bestCardId: CardId): CoachMessage {
  return {
    key: VERDICT_KEY[verdict],
    params: verdict === 'BETTER_EXISTS' ? { card: bestCardId } : {},
  };
}

export function trumpHintMessage(hint: TrumpHint): CoachMessage {
  if (hint.highCards.length === 0) {
    return { key: TRUMP_HINT_NO_HIGH_KEY, params: { suit: hint.suit, count: hint.count } };
  }
  return {
    key: TRUMP_HINT_KEY,
    params: { suit: hint.suit, count: hint.count, highCards: hint.highCards },
  };
}
