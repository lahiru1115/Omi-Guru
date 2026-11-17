// Coach bubbles for Practice (SPEC §6.1): turns a hint or a move review into a header plus lines of
// coach messages. Still language-free: the UI turns each message into text with coachText().
import type { Decision, ReasonCode } from '../ai/bot';
import type { CardId, PlayerView } from '../engine/types';
import { mistakeMessage, reasonMessage, verdictMessage, type CoachMessage } from './reasons';
import type { Review } from './review';

export type CoachBubbleContent = { header?: CoachMessage; lines: CoachMessage[] };

function reasonLines(
  reasons: readonly ReasonCode[],
  view: PlayerView,
  cardId: CardId,
): CoachMessage[] {
  return reasons.map((code) => reasonMessage(code, view, cardId));
}

/** The 💡 hint bubble: the suggested card's reasons. */
export function hintBubble(view: PlayerView, hint: Decision): CoachBubbleContent {
  return { lines: reasonLines(hint.reasons, view, hint.cardId) };
}

/**
 * The feedback bubble after the human plays `playedId` (`viewBefore` = the view before the play).
 * - GOOD: the verdict and why the card is good.
 * - OK: the verdict only.
 * - BETTER_EXISTS: the verdict (naming the better card), what went wrong, and why the better card is better.
 */
export function reviewBubble(
  viewBefore: PlayerView,
  playedId: CardId,
  review: Review,
): CoachBubbleContent {
  const header = verdictMessage(review.verdict, review.bestCardId);
  switch (review.verdict) {
    case 'GOOD':
      return { header, lines: reasonLines(review.bestReasons, viewBefore, review.bestCardId) };
    case 'OK':
      return { header, lines: [] };
    case 'BETTER_EXISTS':
      return {
        header,
        lines: [
          ...review.mistakes.map((code) => mistakeMessage(code, viewBefore, playedId)),
          ...reasonLines(review.bestReasons, viewBefore, review.bestCardId),
        ],
      };
  }
}

/** A bot's reasons for the card it played (`view` = that bot's view before the play). */
export function botReasonLines(view: PlayerView, decision: Decision): CoachMessage[] {
  return reasonLines(decision.reasons, view, decision.cardId);
}
