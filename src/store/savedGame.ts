// The unfinished game saved to omi.savedGame.v1 (SPEC §7, §10.2), so Home can offer Continue.
import type { BotDifficulty, GameState, Phase } from '../engine/types';
import { loadJSON, removeJSON, saveJSON, STORAGE_KEYS } from '../storage/persist';
import { isRecord, mergeSettings } from './mergeSettings';

export type GameMode = 'real';

export type SavedGame = {
  v: 1;
  mode: GameMode;
  difficulty: BotDifficulty;
  seed: number;
  state: GameState;
};

const PHASES: readonly Phase[] = [
  'DEAL_FIRST',
  'CHOOSE_TRUMP',
  'DEAL_SECOND',
  'PLAYING',
  'ROUND_END',
  'GAME_OVER',
];

function isNumberPair(value: unknown): boolean {
  return Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === 'number');
}

function isHands(value: unknown): boolean {
  return Array.isArray(value) && value.length === 4 && value.every((h) => Array.isArray(h));
}

function isTrick(value: unknown): boolean {
  return isRecord(value) && typeof value.leader === 'number' && Array.isArray(value.plays);
}

/** A shape check, enough to reject corrupt or foreign data before the engine sees it. */
export function isSavedGame(value: unknown): value is SavedGame {
  if (!isRecord(value) || value.v !== 1 || value.mode !== 'real') return false;
  if (!['easy', 'medium', 'hard'].includes(value.difficulty as string)) return false;
  if (typeof value.seed !== 'number') return false;
  const state = value.state;
  if (!isRecord(state)) return false;
  if (!PHASES.includes(state.phase as Phase) || state.phase === 'GAME_OVER') return false;
  if (!isRecord(state.settings) || !isNumberPair(state.scores)) return false;
  if (typeof state.pendingTieBonus !== 'number' || typeof state.rngState !== 'number') return false;
  if (!Array.isArray(state.roundHistory)) return false;
  const round = state.round;
  if (!isRecord(round)) return false;
  return (
    typeof round.number === 'number' &&
    typeof round.dealer === 'number' &&
    typeof round.trumpChooser === 'number' &&
    typeof round.turn === 'number' &&
    isHands(round.hands) &&
    isHands(round.secondBlock) &&
    isTrick(round.currentTrick) &&
    Array.isArray(round.completedTricks) &&
    isNumberPair(round.tricksWon)
  );
}

export function saveGame(saved: SavedGame): boolean {
  return saveJSON(STORAGE_KEYS.savedGame, saved);
}

/** The saved game, or null when there is none or it is invalid. */
export function loadSavedGame(): SavedGame | null {
  const value = loadJSON(STORAGE_KEYS.savedGame);
  if (!isSavedGame(value)) return null;
  return { ...value, state: { ...value.state, settings: mergeSettings(value.state.settings) } };
}

export function clearSavedGame(): void {
  removeJSON(STORAGE_KEYS.savedGame);
}

export function hasSavedGame(): boolean {
  return loadSavedGame() !== null;
}
