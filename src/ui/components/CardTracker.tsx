// Card tracker (SPEC §6.1): a 4×8 grid of all 32 cards. Played cards are greyed out, each suit's
// master (the highest card still out) is marked ★, and the number of trumps left is shown.
// Built only from the human's PlayerView (public tricks + own hand), like the coach.
import { buildTracker, masterOf, trumpsRemaining } from '../../ai/cardTracker';
import { RANKS, SUITS } from '../../engine/cards';
import type { CardId, PlayerView } from '../../engine/types';
import { useSettingsStore } from '../../store/settingsStore';
import { SUIT_KEY, SUIT_SYMBOL, suitColorClass } from '../suits';
import { useT } from '../useT';

type Props = {
  view: PlayerView;
  onClose?: () => void;
  /** Extra glow on these cards (lessons). */
  highlight?: readonly CardId[];
};

export function CardTracker({ view, onClose, highlight }: Props) {
  const t = useT();
  const fourColor = useSettingsStore((s) => s.fourColorDeck);
  const tracker = buildTracker(view, 'full');
  const mine = new Set(view.hand.map((c) => c.id));

  return (
    <section className="tracker" aria-labelledby="tracker-title">
      <header className="tracker__head">
        <h2 id="tracker-title" className="tracker__title">
          {t('tracker.title')}
        </h2>
        {view.trump !== null && (
          <span className="tracker__trumps">
            {t('tracker.trumpsLeft', { n: trumpsRemaining(tracker) })}
          </span>
        )}
        {onClose && (
          <button
            type="button"
            className="tracker__close"
            aria-label={t('coach.close')}
            onClick={onClose}
          >
            ✕
          </button>
        )}
      </header>
      <table className="tracker__grid">
        <tbody>
          {SUITS.map((suit) => {
            const master = masterOf(tracker, suit);
            return (
              <tr key={suit} className={suit === view.trump ? 'tracker__row--trump' : undefined}>
                <th scope="row" className={`tracker__suit ${suitColorClass(suit, fourColor)}`}>
                  <span aria-hidden="true">{SUIT_SYMBOL[suit]}</span>
                  <span className="visually-hidden">{t(SUIT_KEY[suit])}</span>
                </th>
                {RANKS.map((rank) => {
                  const id: CardId = `${rank}${suit}`;
                  const played = tracker.played.has(id);
                  const classes = [
                    'tracker__cell',
                    played && 'tracker__cell--played',
                    mine.has(id) && 'tracker__cell--mine',
                    id === master && 'tracker__cell--master',
                    highlight?.includes(id) && 'tracker__cell--highlight',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  const label = t('card.label', { rank, suit: t(SUIT_KEY[suit]) });
                  const state = played
                    ? t('tracker.played')
                    : id === master
                      ? t('tracker.master')
                      : '';
                  return (
                    <td
                      key={id}
                      className={classes}
                      aria-label={state ? `${label}: ${state}` : label}
                    >
                      {rank}
                      {id === master && (
                        <span className="tracker__star" aria-hidden="true">
                          ★
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="tracker__legend">{t('tracker.legend')}</p>
    </section>
  );
}
