import { useState } from 'react';
import type { MessageKey } from '../../content/i18n/t';
import { gameStore, useGameStore } from '../../store/gameStore';
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
 * Home screen (SPEC §8.1). Continue appears when a saved game exists. Learn, Rules, Stats and
 * Settings stay disabled until their milestones.
 */
export function Home() {
  const t = useT();
  const hasSave = useGameStore((s) => s.hasSave);
  const [confirming, setConfirming] = useState(false);
  const { newGame, continueGame } = gameStore.getState();

  const startRealGame = () => {
    if (hasSave) setConfirming(true);
    else newGame();
  };

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

        {confirming ? (
          <div className="home__confirm" role="alertdialog" aria-labelledby="home-confirm-text">
            <p id="home-confirm-text" className="home__confirm-text">
              {t('home.newGameConfirm')}
            </p>
            <button
              type="button"
              className="home__button home__button--primary"
              onClick={() => {
                setConfirming(false);
                newGame();
              }}
            >
              {t('home.confirmYes')}
            </button>
            <button type="button" className="home__button" onClick={() => setConfirming(false)}>
              {t('home.confirmNo')}
            </button>
          </div>
        ) : (
          <div className="home__menu">
            {hasSave && (
              <button
                type="button"
                className="home__button home__button--primary"
                onClick={() => continueGame()}
              >
                {t('home.continue')}
              </button>
            )}
            <button type="button" className="home__button" disabled>
              {t('home.learn')}
            </button>
            <button
              type="button"
              className={hasSave ? 'home__button' : 'home__button home__button--primary'}
              onClick={startRealGame}
            >
              {t('home.realGame')}
            </button>
            <div className="home__secondary">
              {SECONDARY_ITEMS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="home__button home__button--small"
                  disabled
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
