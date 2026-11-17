// Turns a coach message (an i18n key plus raw params) into display text in the given language.
// Card ids become short names like "K♠︎" and suits become their translated names (SPEC §9.1).
import type { CoachMessage } from '../coach/reasons';
import { translate, type Language, type TParams } from '../content/i18n/t';
import { cardFromId } from '../engine/cards';
import type { CardId } from '../engine/types';
import { SUIT_KEY, SUIT_SYMBOL } from './suits';

export function shortCardName(id: CardId): string {
  const card = cardFromId(id);
  return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
}

export function coachText(lang: Language, message: CoachMessage): string {
  const { card, best, suit, count, highCards } = message.params;
  const params: Record<string, string | number> = {};
  if (card) params.card = shortCardName(card);
  if (best) params.best = shortCardName(best);
  if (suit) params.suit = translate(lang, SUIT_KEY[suit]);
  if (count !== undefined) params.count = count;
  if (highCards) params.highCards = highCards.map(shortCardName).join(', ');
  return translate(lang, message.key, params satisfies TParams);
}
