// A playing card drawn with SVG in code (SPEC §8.3): English rank letters, red ♥♦ and black ♠♣,
// with an optional 4-colour deck. No image files.
import type { Card as CardData } from '../../engine/types';
import { useSettingsStore } from '../../store/settingsStore';
import { SUIT_KEY, SUIT_SYMBOL, suitColorClass } from '../suits';
import { useT } from '../useT';

type Props = { card: CardData; className?: string };

export function Card({ card, className }: Props) {
  const t = useT();
  const fourColor = useSettingsStore((s) => s.fourColorDeck);
  const symbol = SUIT_SYMBOL[card.suit];
  const label = t('card.label', { rank: card.rank, suit: t(SUIT_KEY[card.suit]) });
  const wide = card.rank === '10';

  return (
    <svg
      className={`card ${suitColorClass(card.suit, fourColor)} ${className ?? ''}`}
      viewBox="0 0 60 84"
      role="img"
      aria-label={label}
    >
      <rect className="card__face" x="0.75" y="0.75" width="58.5" height="82.5" rx="5" />
      <g className="card__ink">
        <text className="card__rank" x="5" y="17" textLength={wide ? 17 : undefined}>
          {card.rank}
        </text>
        <text className="card__pip" x="5" y="30">
          {symbol}
        </text>
        <text className="card__center" x="30" y="58" textAnchor="middle">
          {symbol}
        </text>
        <g transform="rotate(180 30 42)">
          <text className="card__rank" x="5" y="17" textLength={wide ? 17 : undefined}>
            {card.rank}
          </text>
        </g>
      </g>
    </svg>
  );
}
