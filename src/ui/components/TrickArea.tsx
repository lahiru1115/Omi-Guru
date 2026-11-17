// The centre of the table: each card sits on the side of the player who played it (SPEC §8.2).
// Cards slide in from their player; a finished trick slides towards the winner (SPEC §8.4).
// The whole area is a "play here" button while a raised card can be played. In Practice, tapping a
// bot's card shows why the bot played it (`onCardTap`), and in lessons cards can be highlighted.
import type { CardId, Seat, Trick } from '../../engine/types';
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
  /** Practice: tap a bot's card to see its reason. Called only for cards in `tappableIds`. */
  onCardTap?: (cardId: CardId) => void;
  tappableIds?: readonly CardId[];
  highlightIds?: readonly CardId[];
};

export function TrickArea({
  trick,
  collectTo,
  winner,
  canTap,
  onTap,
  onCardTap,
  tappableIds,
  highlightIds,
}: Props) {
  const t = useT();
  const seatName = useSeatName();
  const collecting = collectTo !== null;

  return (
    <div
      className={`trick ${canTap ? 'trick--can-play' : ''} ${
        collecting ? `trick--collect trick--to-${SEAT_POSITION[collectTo]}` : ''
      }`}
    >
      <button
        type="button"
        className="trick__play"
        aria-label={t('game.trickArea')}
        disabled={!canTap}
        onClick={onTap}
      />
      {trick.plays.map((play) => {
        const tappable =
          !canTap && !collecting && onCardTap !== undefined && tappableIds?.includes(play.card.id);
        const className = `trick__card trick__card--${SEAT_POSITION[play.seat]} ${
          winner === play.seat ? 'trick__card--winner' : ''
        } ${highlightIds?.includes(play.card.id) ? 'trick__card--highlight' : ''}`;
        return tappable ? (
          <button
            key={play.card.id}
            type="button"
            className={`${className} trick__card--tappable`}
            aria-label={t('coach.whyBot', { name: seatName(play.seat) })}
            onClick={() => onCardTap(play.card.id)}
          >
            <Card card={play.card} />
          </button>
        ) : (
          <span key={play.card.id} className={className}>
            <Card card={play.card} />
          </span>
        );
      })}
      {winner !== null && !collecting && (
        <span className="trick__winner" role="status">
          {t('game.trickWonBy', { name: seatName(winner) })}
        </span>
      )}
    </div>
  );
}
