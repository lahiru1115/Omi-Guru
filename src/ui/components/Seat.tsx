// A bot seat around the table: name, face-down cards, dealer chip and turn glow (SPEC §8.2).
// Practice "show all cards" passes `cards` to draw them face up. That is UI only: bots and the
// coach still see nothing but their own PlayerView.
import type { CSSProperties } from 'react';
import type { Card as CardData, Seat as SeatNumber } from '../../engine/types';
import { sortHand } from '../sortHand';
import { SEAT_POSITION } from '../suits';
import { useSeatName } from '../useSeatName';
import { useT } from '../useT';
import { Card } from './Card';
import { CardBack } from './CardBack';

type Props = {
  seat: SeatNumber;
  cardCount: number;
  isDealer: boolean;
  isActive: boolean;
  /** Face-up cards (Practice "show all cards"). */
  cards?: readonly CardData[] | null;
};

export function Seat({ seat, cardCount, isDealer, isActive, cards }: Props) {
  const t = useT();
  const seatName = useSeatName();
  const position = SEAT_POSITION[seat];

  return (
    <div className={`seat seat--${position} ${isActive ? 'seat--active' : ''}`}>
      <div className="seat__label">
        <span className="seat__name">{seatName(seat)}</span>
        {isDealer && (
          <span className="seat__dealer" title={t('game.dealer')} aria-label={t('game.dealer')}>
            {t('game.dealerChip')}
          </span>
        )}
      </div>
      {cards ? (
        <div className="seat__faceup" role="group" aria-label={seatName(seat)}>
          {sortHand(cards, null).map((card) => (
            <Card key={card.id} card={card} className="seat__mini" />
          ))}
        </div>
      ) : (
        <div
          className="seat__cards"
          role="img"
          aria-label={t('game.cardsLeft', { n: cardCount })}
          style={{ '--n': cardCount } as CSSProperties}
        >
          {Array.from({ length: cardCount }, (_, i) => (
            <CardBack key={i} className="seat__back" />
          ))}
        </div>
      )}
    </div>
  );
}
