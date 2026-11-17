import { lazy, Suspense, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { useNavStore, type Screen } from './store/navStore';
import { useSettingsStore } from './store/settingsStore';
import { UpdateToast } from './ui/components/UpdateToast';
import { Home } from './ui/screens/Home';

// Home loads with the app; every other screen is its own chunk so the first paint is faster.
// The service worker precaches all chunks, so they still open offline.
const GameTable = lazy(() =>
  import('./ui/screens/GameTable').then((m) => ({ default: m.GameTable })),
);
const LessonList = lazy(() =>
  import('./ui/screens/LessonList').then((m) => ({ default: m.LessonList })),
);
const LessonPlayer = lazy(() =>
  import('./ui/screens/LessonPlayer').then((m) => ({ default: m.LessonPlayer })),
);
const Rules = lazy(() => import('./ui/screens/Rules').then((m) => ({ default: m.Rules })));
const Settings = lazy(() => import('./ui/screens/Settings').then((m) => ({ default: m.Settings })));
const Stats = lazy(() => import('./ui/screens/Stats').then((m) => ({ default: m.Stats })));

export function App() {
  const language = useSettingsStore((state) => state.language);
  const inGame = useGameStore((state) => state.game !== null);
  const screen = useNavStore((state) => state.screen);

  // Keep <html lang> in sync so screen readers and the browser pick the right language.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <>
      <Suspense fallback={null}>
        <CurrentScreen inGame={inGame} screen={screen} />
      </Suspense>
      <UpdateToast />
    </>
  );
}

function CurrentScreen({ inGame, screen }: { inGame: boolean; screen: Screen }) {
  // A game in progress (Real or Practice) always shows the table (SPEC §8.1).
  if (inGame) return <GameTable />;
  switch (screen.name) {
    case 'lessons':
      return <LessonList />;
    case 'lesson':
      return <LessonPlayer lessonId={screen.id} />;
    case 'rules':
      return <Rules />;
    case 'settings':
      return <Settings />;
    case 'stats':
      return <Stats />;
    case 'home':
      return <Home />;
  }
}
