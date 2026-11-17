// The human's cards: an overlapped fan sorted by suit (SPEC §8.2). Tap once to raise, tap again
// (or tap the table) to play. In a Real game nothing is dimmed; an illegal tap shakes the card.
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
};

export function Hand({ cards, trump, canPlay, raisedCardId, shake, onTap }: Props) {
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
        return (
          <button
            // Re-keying on the shake nonce restarts the shake animation on every illegal tap.
            key={shaking ? `${card.id}-${shake.nonce}` : card.id}
            type="button"
            className={`hand__card ${raised ? 'hand__card--raised' : ''} ${shaking ? 'hand__card--shake' : ''}`}
            style={{ '--i': i } as CSSProperties}
            aria-pressed={raised}
            disabled={!canPlay}
            onClick={() => onTap(card.id)}
          >
            <Card card={card} />
          </button>
        );
      })}
    </div>
  );
}
