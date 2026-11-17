import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { useNavStore } from './store/navStore';
import { useSettingsStore } from './store/settingsStore';
import { GameTable } from './ui/screens/GameTable';
import { Home } from './ui/screens/Home';
import { LessonList } from './ui/screens/LessonList';
import { LessonPlayer } from './ui/screens/LessonPlayer';
import { Rules } from './ui/screens/Rules';

export function App() {
  const language = useSettingsStore((state) => state.language);
  const inGame = useGameStore((state) => state.game !== null);
  const screen = useNavStore((state) => state.screen);

  // Keep <html lang> in sync so screen readers and the browser pick the right language.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // A game in progress (Real or Practice) always shows the table (SPEC §8.1).
  if (inGame) return <GameTable />;
  switch (screen.name) {
    case 'lessons':
      return <LessonList />;
    case 'lesson':
      return <LessonPlayer lessonId={screen.id} />;
    case 'rules':
      return <Rules />;
    case 'home':
      return <Home />;
  }
}
