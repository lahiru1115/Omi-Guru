import type { MessageKey } from '../../content/i18n/t';
import { LanguageToggle } from '../components/LanguageToggle';
import '../styles/home.css';
import { useT } from '../useT';

// Decorative suit pips. U+FE0E keeps iOS from drawing them as emoji.
const SUITS = [
  { symbol: '♠︎', red: false },
  { symbol: '♥︎', red: true },
  { symbol: '♦︎', red: true },
  { symbol: '♣︎', red: false },
] as const;

const SECONDARY_ITEMS: readonly MessageKey[] = ['home.rules', 'home.stats', 'home.settings'];

/**
 * Placeholder Home screen (SPEC §8.1). The menu buttons are disabled until their screens
 * exist. "Continue" (home.continue) appears from M2, when a saved game exists.
 */
export function Home() {
  const t = useT();

  return (
    <main className="home">
      <header className="home__bar">
        <LanguageToggle />
      </header>

      <div className="home__content">
        <div className="home__brand">
          <ul className="home__suits" aria-hidden="true">
            {SUITS.map(({ symbol, red }) => (
              <li key={symbol} className={red ? 'home__suit home__suit--red' : 'home__suit'}>
                {symbol}
              </li>
            ))}
          </ul>
          <h1 className="home__title">{t('app.title')}</h1>
        </div>

        <div className="home__menu">
          <button type="button" className="home__button home__button--primary" disabled>
            {t('home.learn')}
          </button>
          <button type="button" className="home__button" disabled>
            {t('home.realGame')}
          </button>
          <div className="home__secondary">
            {SECONDARY_ITEMS.map((key) => (
              <button key={key} type="button" className="home__button home__button--small" disabled>
                {t(key)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
