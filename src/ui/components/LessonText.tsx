// Lesson text with card tokens ([AS]) drawn as small coloured cards and suit tokens ([S]) as pips.
import { Fragment } from 'react';
import { cardFromId } from '../../engine/cards';
import { useSettingsStore } from '../../store/settingsStore';
import { parseTokens } from '../lessonTokens';
import { SUIT_KEY, SUIT_SYMBOL, suitColorClass } from '../suits';
import { useT } from '../useT';

type Props = { text: string; className?: string; as?: 'p' | 'span' };

export function LessonText({ text, className, as = 'p' }: Props) {
  const t = useT();
  const fourColor = useSettingsStore((s) => s.fourColorDeck);
  const Tag = as;
  return (
    <Tag className={className}>
      {parseTokens(text).map((part, i) => {
        if (part.kind === 'text') return <Fragment key={i}>{part.text}</Fragment>;
        if (part.kind === 'suit') {
          return (
            <span
              key={i}
              className={`chip chip--suit ${suitColorClass(part.suit, fourColor)}`}
              role="img"
              aria-label={t(SUIT_KEY[part.suit])}
            >
              {SUIT_SYMBOL[part.suit]}
            </span>
          );
        }
        const card = cardFromId(part.id);
        return (
          <span
            key={i}
            className={`chip ${suitColorClass(card.suit, fourColor)}`}
            role="img"
            aria-label={t('card.label', { rank: card.rank, suit: t(SUIT_KEY[card.suit]) })}
          >
            {card.rank}
            {SUIT_SYMBOL[card.suit]}
          </span>
        );
      })}
    </Tag>
  );
}
