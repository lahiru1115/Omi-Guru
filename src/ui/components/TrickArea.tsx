// The centre of the table: each card sits on the side of the player who played it (SPEC §8.2).
// Cards slide in from their player; a finished trick slides towards the winner (SPEC §8.4).
import type { Seat, Trick } from '../../engine/types';
import { SEAT_POSITION } from '../suits';
import { useSeatName } from '../useSeatName';
import { useT } from '../useT';
import { Card } from './Card';

type Props = {
  trick: Trick;
  collectTo: Seat | null; // set while the finished trick slides to the winner
  winner: Seat | null; // set while a finished trick is on show
  canTap: boolean;
  onTap: () => void;
};

export function TrickArea({ trick, collectTo, winner, canTap, onTap }: Props) {
  const t = useT();
  const seatName = useSeatName();
  const collecting = collectTo !== null;

  return (
    <button
      type="button"
      className={`trick ${collecting ? `trick--collect trick--to-${SEAT_POSITION[collectTo]}` : ''}`}
      aria-label={t('game.trickArea')}
      disabled={!canTap}
      onClick={onTap}
    >
      {trick.plays.map((play) => (
        <span
          key={play.card.id}
          className={`trick__card trick__card--${SEAT_POSITION[play.seat]} ${
            winner === play.seat ? 'trick__card--winner' : ''
          }`}
        >
          <Card card={play.card} />
        </span>
      ))}
      {winner !== null && !collecting && (
        <span className="trick__winner" role="status">
          {t('game.trickWonBy', { name: seatName(winner) })}
        </span>
      )}
    </button>
  );
}
