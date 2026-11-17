import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { useSettingsStore } from './store/settingsStore';
import { GameTable } from './ui/screens/GameTable';
import { Home } from './ui/screens/Home';

export function App() {
  const language = useSettingsStore((state) => state.language);
  const inGame = useGameStore((state) => state.game !== null);

  // Keep <html lang> in sync so screen readers and the browser pick the right language.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return inGame ? <GameTable /> : <Home />;
}
