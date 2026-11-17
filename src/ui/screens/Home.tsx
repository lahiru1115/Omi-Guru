import { useState } from 'react';
import type { MessageKey } from '../../content/i18n/t';
import type { BotDifficulty } from '../../engine/types';
import { gameStore, useGameStore } from '../../store/gameStore';
import { useSettingsStore } from '../../store/settingsStore';
import { DifficultyPicker } from '../components/DifficultyPicker';
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

type Panel = 'menu' | 'difficulty' | 'confirm';

/**
 * Home screen (SPEC §8.1). Continue appears when a saved game exists. Real game first asks for the
 * difficulty (SPEC §7). Learn, Rules, Stats and Settings stay disabled until their milestones.
 */
export function Home() {
  const t = useT();
  const hasSave = useGameStore((s) => s.hasSave);
  const savedDifficulty = useSettingsStore((s) => s.botDifficulty);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [panel, setPanel] = useState<Panel>('menu');
  const [difficulty, setDifficulty] = useState<BotDifficulty>(savedDifficulty);
  const { newGame, continueGame } = gameStore.getState();

  const openPicker = () => {
    setDifficulty(savedDifficulty);
    setPanel('difficulty');
  };

  const startWithDifficulty = () => {
    updateSettings({ botDifficulty: difficulty });
    if (hasSave) setPanel('confirm');
    else newGame({ difficulty });
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

        {panel === 'difficulty' && (
          <DifficultyPicker
            value={difficulty}
            onChange={setDifficulty}
            onStart={startWithDifficulty}
            onBack={() => setPanel('menu')}
          />
        )}
        {panel === 'confirm' && (
          <div className="home__confirm" role="alertdialog" aria-labelledby="home-confirm-text">
            <p id="home-confirm-text" className="home__confirm-text">
              {t('home.newGameConfirm')}
            </p>
            <button
              type="button"
              className="home__button home__button--primary"
              onClick={() => {
                setPanel('menu');
                newGame({ difficulty });
              }}
            >
              {t('home.confirmYes')}
            </button>
            <button type="button" className="home__button" onClick={() => setPanel('menu')}>
              {t('home.confirmNo')}
            </button>
          </div>
        )}
        {panel === 'menu' && (
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
              onClick={openPicker}
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
