// App settings (the full GameSettings, SPEC §10.1), saved to omi.settings.v1.
// Saved data is always merged over the defaults field by field, so older or partial saves still load
// and a bad value falls back to its default instead of breaking the app.
import { create } from 'zustand';
import type { Language } from '../content/i18n/t';
import { DEFAULT_GAME_SETTINGS, type GameSettings } from '../engine/types';
import { loadJSON, saveJSON, STORAGE_KEYS } from '../storage/persist';
import { mergeSettings } from './mergeSettings';

export type Settings = GameSettings;

type SettingsActions = {
  setLanguage: (language: Language) => void;
  updateSettings: (patch: Partial<GameSettings>) => void;
  /** Back to the defaults (used by Settings → reset all data). Not saved: the key is removed. */
  resetSettings: () => void;
};

export const DEFAULT_SETTINGS: Settings = DEFAULT_GAME_SETTINGS;

export { mergeSettings };

/** Only the data fields, without the store's action functions. */
export function toSaved(state: Settings): Settings {
  return mergeSettings(state);
}

export const useSettingsStore = create<Settings & SettingsActions>()((set, get) => ({
  ...mergeSettings(loadJSON(STORAGE_KEYS.settings)),
  setLanguage: (language) => {
    set({ language });
    saveJSON(STORAGE_KEYS.settings, toSaved(get()));
  },
  updateSettings: (patch) => {
    set(patch);
    saveJSON(STORAGE_KEYS.settings, toSaved(get()));
  },
  resetSettings: () => set(mergeSettings(undefined)),
}));

/** The current settings as plain data (for non-React callers such as the game store). */
export function getSettings(): Settings {
  return toSaved(useSettingsStore.getState());
}
