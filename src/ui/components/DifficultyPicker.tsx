import type { MessageKey } from '../../content/i18n/t';
import type { BotDifficulty } from '../../engine/types';
import { useT } from '../useT';

const LEVELS: readonly { level: BotDifficulty; name: MessageKey; desc: MessageKey }[] = [
  { level: 'easy', name: 'difficulty.easy', desc: 'difficulty.easyDesc' },
  { level: 'medium', name: 'difficulty.medium', desc: 'difficulty.mediumDesc' },
  { level: 'hard', name: 'difficulty.hard', desc: 'difficulty.hardDesc' },
];

type Props = {
  value: BotDifficulty;
  onChange: (level: BotDifficulty) => void;
  onStart: () => void;
  onBack: () => void;
};

/** Difficulty choice before a Real game (SPEC §7): පහසු / සාමාන්‍ය / අමාරු. */
export function DifficultyPicker({ value, onChange, onStart, onBack }: Props) {
  const t = useT();
  return (
    <form
      className="difficulty"
      onSubmit={(e) => {
        e.preventDefault();
        onStart();
      }}
    >
      <fieldset className="difficulty__options">
        <legend className="difficulty__title">{t('difficulty.title')}</legend>
        {LEVELS.map(({ level, name, desc }) => (
          <label
            key={level}
            className={
              level === value
                ? 'difficulty__option difficulty__option--selected'
                : 'difficulty__option'
            }
          >
            <input
              type="radio"
              name="difficulty"
              value={level}
              checked={level === value}
              onChange={() => onChange(level)}
              className="difficulty__radio"
            />
            <span className="difficulty__name">{t(name)}</span>
            <span className="difficulty__desc">{t(desc)}</span>
          </label>
        ))}
      </fieldset>
      <div className="difficulty__actions">
        <button type="button" className="home__button" onClick={onBack}>
          {t('difficulty.back')}
        </button>
        <button type="submit" className="home__button home__button--primary">
          {t('difficulty.start')}
        </button>
      </div>
    </form>
  );
}
