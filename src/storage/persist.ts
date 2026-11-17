// All localStorage access goes through this module (CLAUDE.md rule 7).
// iOS Safari can throw on any access (private mode, full storage, blocked site data),
// so every call is wrapped in try/catch and failures fall back quietly.

export const STORAGE_KEYS = {
  settings: 'omi.settings.v1',
  progress: 'omi.progress.v1',
  stats: 'omi.stats.v1',
  savedGame: 'omi.savedGame.v1',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Reads and parses a stored JSON value. Returns `undefined` when the key is missing,
 * the JSON is invalid or storage is unavailable. The caller must validate the result.
 */
export function loadJSON(key: StorageKey): unknown {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (raw == null) return undefined;
    const value: unknown = JSON.parse(raw);
    return value;
  } catch {
    return undefined;
  }
}

/** Stores a value as JSON. Returns `false` if storage is unavailable or full. */
export function saveJSON(key: StorageKey, value: unknown): boolean {
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
