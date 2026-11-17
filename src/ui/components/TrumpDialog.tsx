// Trump choice dialog (SPEC §8.1): the human picks a suit after seeing their first 4 cards.
// It sits over the table centre so the 4 cards in the hand stay visible below it.
// In Practice (and after a wrong pick in a lesson) it also shows the trump hint (SPEC §5.5):
// the suggested suit and every suit's score as a small bar list, so the learner sees why.
import { useEffect, useRef } from 'react';
import type { TrumpHint } from '../../coach/hintEngine';
import { trumpHintMessage } from '../../coach/reasons';
import { SUITS } from '../../engine/cards';
import type { Suit } from '../../engine/types';
import { useSettingsStore } from '../../store/settingsStore';
import { coachText } from '../coachText';
import { SUIT_KEY, SUIT_SYMBOL, suitColorClass } from '../suits';
import { useT } from '../useT';

type Props = {
  onChoose: (suit: Suit) => void;
  hint?: TrumpHint | null;
  /** A message shown above the suits (e.g. a lesson's retry text). */
  note?: string | null;
  /** `trump-dialog--inline` puts it in the page flow instead of over the table (lessons). */
  className?: string;
};

export function TrumpDialog({ onChoose, hint, note, className }: Props) {
  const t = useT();
  const fourColor = useSettingsStore((s) => s.fourColorDeck);
  const language = useSettingsStore((s) => s.language);
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstButton.current?.focus({ preventScroll: true });
  }, []);

  const maxScore = Math.max(1, ...(hint?.ranking.map((r) => r.score) ?? [1]));

  return (
    <div
      className={`trump-dialog ${hint ? 'trump-dialog--hint' : ''} ${className ?? ''}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="trump-dialog-title"
    >
      <h2 id="trump-dialog-title" className="trump-dialog__title">
        {t('trump.title')}
      </h2>
      {!hint && <p className="trump-dialog__prompt">{t('trump.prompt')}</p>}
      {note && <p className="trump-dialog__note">{note}</p>}
      {hint && (
        <div className="trump-hint">
          <p className="trump-hint__text">💡 {coachText(language, trumpHintMessage(hint))}</p>
          <ul className="trump-hint__bars" aria-label={t('trumpHint.scores')}>
            {hint.ranking.map((r) => (
              <li key={r.suit} className="trump-hint__row">
                <span className={`trump-hint__pip ${suitColorClass(r.suit, fourColor)}`}>
                  {SUIT_SYMBOL[r.suit]}
                </span>
                <span className="trump-hint__track">
                  <span
                    className={`trump-hint__fill ${r.suit === hint.suit ? 'trump-hint__fill--best' : ''}`}
                    style={{ width: `${(r.score / maxScore) * 100}%` }}
                  />
                </span>
                <span className="trump-hint__score">
                  {t('trumpHint.score', { score: r.score, count: r.count, points: r.points })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="trump-dialog__suits">
        {SUITS.map((suit, i) => (
          <button
            key={suit}
            ref={i === 0 ? firstButton : undefined}
            type="button"
            className="trump-dialog__suit"
            onClick={() => onChoose(suit)}
          >
            <span
              className={`trump-dialog__pip ${suitColorClass(suit, fourColor)}`}
              aria-hidden="true"
            >
              {SUIT_SYMBOL[suit]}
            </span>
            <span>{t(SUIT_KEY[suit])}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
