// A bot seat around the table: name, face-down cards, dealer chip and turn glow (SPEC §8.2).
import type { CSSProperties } from 'react';
import type { Seat as SeatNumber } from '../../engine/types';
import { SEAT_POSITION } from '../suits';
import { useSeatName } from '../useSeatName';
import { useT } from '../useT';
import { CardBack } from './CardBack';

type Props = {
  seat: SeatNumber;
  cardCount: number;
  isDealer: boolean;
  isActive: boolean;
};

export function Seat({ seat, cardCount, isDealer, isActive }: Props) {
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
    </div>
  );
}
