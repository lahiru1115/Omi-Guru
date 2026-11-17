import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadJSON, saveJSON, STORAGE_KEYS } from '../../src/storage/persist';

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function createThrowingStorage(): Storage {
  const fail = (): never => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  };
  return {
    length: 0,
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('persist', () => {
  it('round-trips a JSON value', () => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    expect(saveJSON(STORAGE_KEYS.settings, { language: 'en' })).toBe(true);
    expect(loadJSON(STORAGE_KEYS.settings)).toEqual({ language: 'en' });
  });

  it('returns undefined for a missing key', () => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    expect(loadJSON(STORAGE_KEYS.stats)).toBeUndefined();
  });

  it('returns undefined for invalid JSON', () => {
    const storage = createMemoryStorage();
    storage.setItem(STORAGE_KEYS.settings, '{not json');
    vi.stubGlobal('localStorage', storage);
    expect(loadJSON(STORAGE_KEYS.settings)).toBeUndefined();
  });

  it('never throws when storage access throws (iOS Safari)', () => {
    vi.stubGlobal('localStorage', createThrowingStorage());
    expect(() => loadJSON(STORAGE_KEYS.settings)).not.toThrow();
    expect(loadJSON(STORAGE_KEYS.settings)).toBeUndefined();
    expect(() => saveJSON(STORAGE_KEYS.settings, { language: 'si' })).not.toThrow();
    expect(saveJSON(STORAGE_KEYS.settings, { language: 'si' })).toBe(false);
  });

  it('copes with localStorage being unavailable', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(loadJSON(STORAGE_KEYS.settings)).toBeUndefined();
    expect(saveJSON(STORAGE_KEYS.settings, { language: 'si' })).toBe(false);
  });
});
