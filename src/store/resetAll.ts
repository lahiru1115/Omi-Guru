// Settings → Debug → "Reset all saved data" (SPEC §10.1): removes every omi.*.v1 key and puts the
// in-memory stores back to their defaults.
import { removeJSON, STORAGE_KEYS } from '../storage/persist';
import { gameStore } from './gameStore';
import { useProgressStore } from './progressStore';
import { useSettingsStore } from './settingsStore';
import { useStatsStore } from './statsStore';

export function resetAllSavedData(): void {
  for (const key of Object.values(STORAGE_KEYS)) removeJSON(key);
  useSettingsStore.getState().resetSettings();
  useProgressStore.getState().reset();
  useStatsStore.getState().reset();
  gameStore.getState().clearSave();
}

/** Parses a seed typed by the player: a whole number from 0 to 2^32 − 1, or null. */
export function parseSeed(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,10}$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value <= 0xffffffff ? value : null;
}
