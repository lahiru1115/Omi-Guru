// App settings, saved to omi.settings.v1.
// M0 holds only the language. Later milestones grow this into the full GameSettings
// (SPEC §10.1). Saved data is always merged over the defaults, so older saves still load.
import { create } from 'zustand';
import { DEFAULT_LANGUAGE, isLanguage, type Language } from '../content/i18n/t';
import { loadJSON, saveJSON, STORAGE_KEYS } from '../storage/persist';

export type Settings = {
  language: Language;
};

type SettingsActions = {
  setLanguage: (language: Language) => void;
};

export const DEFAULT_SETTINGS: Settings = {
  language: DEFAULT_LANGUAGE,
};

function loadSettings(): Settings {
  const saved = loadJSON(STORAGE_KEYS.settings);
  if (typeof saved !== 'object' || saved === null) return DEFAULT_SETTINGS;
  const language = 'language' in saved ? saved.language : undefined;
  return {
    ...DEFAULT_SETTINGS,
    language: isLanguage(language) ? language : DEFAULT_SETTINGS.language,
  };
}

function toSaved(state: Settings): Settings {
  return { language: state.language };
}

export const useSettingsStore = create<Settings & SettingsActions>()((set, get) => ({
  ...loadSettings(),
  setLanguage: (language) => {
    set({ language });
    saveJSON(STORAGE_KEYS.settings, toSaved(get()));
  },
}));
