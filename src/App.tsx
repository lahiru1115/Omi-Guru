import { useEffect } from 'react';
import { useSettingsStore } from './store/settingsStore';
import { Home } from './ui/screens/Home';

export function App() {
  const language = useSettingsStore((state) => state.language);

  // Keep <html lang> in sync so screen readers and the browser pick the right language.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return <Home />;
}
