import { LANGUAGES, type Language, type MessageKey } from '../../content/i18n/t';
import { useSettingsStore } from '../../store/settingsStore';
import '../styles/language-toggle.css';
import { useT } from '../useT';

const LABEL_KEYS = {
  si: 'language.si',
  en: 'language.en',
} as const satisfies Record<Language, MessageKey>;

/** සිං / EN segmented control. The choice is saved in settings and applies instantly. */
export function LanguageToggle() {
  const t = useT();
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  return (
    <div className="lang-toggle" role="group" aria-label={t('language.label')}>
      {LANGUAGES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          className="lang-toggle__option"
          aria-pressed={option === language}
          onClick={() => setLanguage(option)}
        >
          {t(LABEL_KEYS[option])}
        </button>
      ))}
    </div>
  );
}
