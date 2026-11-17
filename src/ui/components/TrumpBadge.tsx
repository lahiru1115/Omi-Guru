// Trump suit, tricks this round and the tie-bonus badge (SPEC §8.2):
// හුරුව: ♠ ඉස්කෝප්පු   අත්: 2 – 1
import type { Suit } from '../../engine/types';
import { useSettingsStore } from '../../store/settingsStore';
import { SUIT_KEY, SUIT_SYMBOL, suitColorClass } from '../suits';
import { useT } from '../useT';

type Props = {
  trump: Suit | null;
  tricksWon: readonly [number, number];
  tieBonus: number;
  roundNumber: number;
};

export function TrumpBadge({ trump, tricksWon, tieBonus, roundNumber }: Props) {
  const t = useT();
  const fourColor = useSettingsStore((s) => s.fourColorDeck);
  return (
    <div className="trumpbadge">
      <span className="trumpbadge__item trumpbadge__round">
        {t('game.round', { n: roundNumber })}
      </span>
      <span className="trumpbadge__item">
        {t('game.trump')}:{' '}
        {trump ? (
          <strong>
            <span className={`trumpbadge__pip ${suitColorClass(trump, fourColor)}`}>
              {SUIT_SYMBOL[trump]}
            </span>{' '}
            {t(SUIT_KEY[trump])}
          </strong>
        ) : (
          <span className="trumpbadge__muted">{t('game.trumpNotChosen')}</span>
        )}
      </span>
      <span className="trumpbadge__item">
        {t('game.tricks')}:{' '}
        <strong>
          {tricksWon[0]} – {tricksWon[1]}
        </strong>
      </span>
      {tieBonus > 0 && (
        <span className="trumpbadge__bonus">{t('game.tieBonusBadge', { bonus: tieBonus })}</span>
      )}
    </div>
  );
}
