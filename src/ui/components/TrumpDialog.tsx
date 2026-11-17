// Trump choice dialog (SPEC §8.1): the human picks a suit after seeing their first 4 cards.
// It sits over the table centre so the 4 cards in the hand stay visible below it.
import { useEffect, useRef } from 'react';
import { SUITS } from '../../engine/cards';
import type { Suit } from '../../engine/types';
import { useSettingsStore } from '../../store/settingsStore';
import { SUIT_KEY, SUIT_SYMBOL, suitColorClass } from '../suits';
import { useT } from '../useT';

type Props = { onChoose: (suit: Suit) => void };

export function TrumpDialog({ onChoose }: Props) {
  const t = useT();
  const fourColor = useSettingsStore((s) => s.fourColorDeck);
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstButton.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      className="trump-dialog"
      role="dialog"
      aria-modal="false"
      aria-labelledby="trump-dialog-title"
    >
      <h2 id="trump-dialog-title" className="trump-dialog__title">
        {t('trump.title')}
      </h2>
      <p className="trump-dialog__prompt">{t('trump.prompt')}</p>
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
