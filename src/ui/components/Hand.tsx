// The human's cards: an overlapped fan sorted by suit (SPEC §8.2). Tap once to raise, tap again
// (or tap the table) to play. In a Real game nothing is dimmed and an illegal tap shakes the card.
// In Practice and Lessons, `legalIds` dims the illegal cards and `hintIds` makes cards glow.
import type { CSSProperties } from 'react';
import type { Card as CardData, CardId, Suit } from '../../engine/types';
import { sortHand } from '../sortHand';
import { useT } from '../useT';
import { Card } from './Card';

type Props = {
  cards: readonly CardData[];
  trump: Suit | null;
  canPlay: boolean;
  raisedCardId: CardId | null;
  shake: { cardId: CardId; nonce: number } | null;
  onTap: (cardId: CardId) => void;
  /** When set, cards not in this list are dimmed and can't be tapped. */
  legalIds?: readonly CardId[] | null;
  /** Cards to make glow (the coach's hint, or a lesson highlight). */
  hintIds?: readonly CardId[];
};

export function Hand({
  cards,
  trump,
  canPlay,
  raisedCardId,
  shake,
  onTap,
  legalIds,
  hintIds,
}: Props) {
  const t = useT();
  const sorted = sortHand(cards, trump);
  const style = { '--n': Math.max(sorted.length, 2) } as CSSProperties;

  return (
    <div
      className={`hand ${canPlay ? 'hand--active' : ''}`}
      role="group"
      aria-label={t('game.hand')}
      style={style}
    >
      {sorted.map((card, i) => {
        const raised = card.id === raisedCardId;
        const shaking = shake?.cardId === card.id;
        const dimmed = canPlay && legalIds != null && !legalIds.includes(card.id);
        const hinted = hintIds?.includes(card.id) ?? false;
        const classes = [
          'hand__card',
          raised && 'hand__card--raised',
          shaking && 'hand__card--shake',
          dimmed && 'hand__card--dimmed',
          hinted && 'hand__card--hint',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <button
            // Re-keying on the shake nonce restarts the shake animation on every illegal tap.
            key={shaking ? `${card.id}-${shake.nonce}` : card.id}
            type="button"
            className={classes}
            style={{ '--i': i } as CSSProperties}
            aria-pressed={raised}
            disabled={!canPlay || dimmed}
            onClick={() => onTap(card.id)}
          >
            <Card card={card} />
          </button>
        );
      })}
    </div>
  );
}
