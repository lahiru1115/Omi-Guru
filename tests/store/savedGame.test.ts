import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyAction, createGame } from '../../src/engine/stateMachine';
import { DEFAULT_GAME_SETTINGS } from '../../src/engine/types';
import { mergeSettings } from '../../src/store/mergeSettings';
import {
  clearSavedGame,
  hasSavedGame,
  isSavedGame,
  loadSavedGame,
  saveGame,
  type SavedGame,
} from '../../src/store/savedGame';
import { STORAGE_KEYS } from '../../src/storage/persist';
import { createMemoryStorage } from './memoryStorage';

function sample(): SavedGame {
  const state = applyAction(createGame(DEFAULT_GAME_SETTINGS, 5), { type: 'START_ROUND' });
  return { v: 1, mode: 'real', difficulty: 'easy', seed: 5, state };
}

describe('saved game (SPEC §10.2)', () => {
  beforeEach(() => vi.stubGlobal('localStorage', createMemoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('round-trips through localStorage', () => {
    expect(hasSavedGame()).toBe(false);
    saveGame(sample());
    expect(loadSavedGame()).toEqual(sample());
    expect(hasSavedGame()).toBe(true);
    clearSavedGame();
    expect(loadSavedGame()).toBeNull();
  });

  it('ignores corrupt or foreign data', () => {
    localStorage.setItem(STORAGE_KEYS.savedGame, '{not json');
    expect(loadSavedGame()).toBeNull();
    localStorage.setItem(STORAGE_KEYS.savedGame, JSON.stringify({ v: 2 }));
    expect(loadSavedGame()).toBeNull();
  });

  it('rejects wrong shapes and finished games', () => {
    const good = sample();
    expect(isSavedGame(good)).toBe(true);
    expect(isSavedGame({ ...good, mode: 'practice' })).toBe(false);
    expect(isSavedGame({ ...good, state: { ...good.state, phase: 'GAME_OVER' } })).toBe(false);
    expect(
      isSavedGame({ ...good, state: { ...good.state, round: { ...good.state.round, hands: [] } } }),
    ).toBe(false);
    expect(isSavedGame(null)).toBe(false);
  });

  it('works when localStorage is missing', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(saveGame(sample())).toBe(false);
    expect(loadSavedGame()).toBeNull();
  });
});

describe('mergeSettings (SPEC §10.1)', () => {
  it('fills missing fields from the defaults (old M0 saves)', () => {
    expect(mergeSettings({ language: 'en' })).toEqual({ ...DEFAULT_GAME_SETTINGS, language: 'en' });
  });

  it('replaces invalid values with defaults', () => {
    const merged = mergeSettings({
      speed: 'warp',
      targetScore: -3,
      oneTapPlay: 'yes',
      botNames: [1, 'A'],
    });
    expect(merged.speed).toBe('normal');
    expect(merged.targetScore).toBe(10);
    expect(merged.oneTapPlay).toBe(false);
    expect(merged.botNames).toEqual(['', 'A', 'අමල්', 'නිමාලි']);
  });

  it('keeps valid values', () => {
    const merged = mergeSettings({ speed: 'fast', practice: { allowUndo: false } });
    expect(merged.speed).toBe('fast');
    expect(merged.practice).toEqual({ highlightLegal: true, autoFeedback: true, allowUndo: false });
  });

  it('returns defaults for non-objects', () => {
    expect(mergeSettings(undefined)).toEqual(DEFAULT_GAME_SETTINGS);
  });
});
