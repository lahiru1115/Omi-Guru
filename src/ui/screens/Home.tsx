import { useState } from 'react';
import type { BotDifficulty } from '../../engine/types';
import { gameStore, useGameStore } from '../../store/gameStore';
import { useNavStore } from '../../store/navStore';
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

type Panel = 'menu' | 'learn' | 'difficulty' | 'confirm';

/**
 * Home screen (SPEC §8.1). Continue appears when a saved game exists. Learn opens Lessons or
 * Practice (the Learning mode); Real game first asks for the difficulty (SPEC §7).
 */
export function Home() {
  const t = useT();
  const hasSave = useGameStore((s) => s.hasSave);
  const savedDifficulty = useSettingsStore((s) => s.botDifficulty);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const go = useNavStore((s) => s.go);
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

        {panel === 'learn' && (
          <div className="home__learn" role="group" aria-labelledby="home-learn-title">
            <h2 id="home-learn-title" className="home__panel-title">
              {t('learn.title')}
            </h2>
            <button
              type="button"
              className="home__choice home__choice--primary"
              onClick={() => go({ name: 'lessons' })}
            >
              <span className="home__choice-title">📖 {t('learn.lessons')}</span>
              <span className="home__choice-desc">{t('learn.lessonsDesc')}</span>
            </button>
            <button
              type="button"
              className="home__choice"
              onClick={() => newGame({ mode: 'practice' })}
            >
              <span className="home__choice-title">🎯 {t('learn.practice')}</span>
              <span className="home__choice-desc">{t('learn.practiceDesc')}</span>
            </button>
            <button type="button" className="home__button" onClick={() => setPanel('menu')}>
              {t('learn.back')}
            </button>
          </div>
        )}
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
            <button
              type="button"
              className={hasSave ? 'home__button' : 'home__button home__button--primary'}
              onClick={() => setPanel('learn')}
            >
              {t('home.learn')}
            </button>
            <button type="button" className="home__button" onClick={openPicker}>
              {t('home.realGame')}
            </button>
            <div className="home__secondary">
              <button
                type="button"
                className="home__button home__button--small"
                onClick={() => go({ name: 'rules' })}
              >
                {t('home.rules')}
              </button>
              <button
                type="button"
                className="home__button home__button--small"
                onClick={() => go({ name: 'stats' })}
              >
                {t('home.stats')}
              </button>
              <button
                type="button"
                className="home__button home__button--small"
                onClick={() => go({ name: 'settings' })}
              >
                {t('home.settings')}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
