// Validates saved settings: merges an unknown object over DEFAULT_GAME_SETTINGS field by field.
// Pure (no storage access), so the settings store and the saved-game loader can both use it.
import { isLanguage } from '../content/i18n/t';
import { DEFAULT_GAME_SETTINGS, type GameSettings } from '../engine/types';

type Rec = Record<string, unknown>;

export function isRecord(value: unknown): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickNumber(saved: Rec, key: keyof GameSettings, fallback: number, min = 0): number {
  const v = saved[key];
  return typeof v === 'number' && Number.isFinite(v) && v >= min ? v : fallback;
}

function pickBoolean(saved: Rec, key: string, fallback: boolean): boolean {
  const v = saved[key];
  return typeof v === 'boolean' ? v : fallback;
}

function pickOneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return (options as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

/** Merges an unknown saved object over the defaults, validating every field. */
export function mergeSettings(saved: unknown): GameSettings {
  const d = DEFAULT_GAME_SETTINGS;
  if (!isRecord(saved)) return { ...d, practice: { ...d.practice }, botNames: [...d.botNames] };
  const practice = isRecord(saved.practice) ? saved.practice : {};
  const names = Array.isArray(saved.botNames) ? saved.botNames : [];
  const botNames = d.botNames.map((fallback, i) =>
    typeof names[i] === 'string' ? (names[i] as string) : fallback,
  ) as GameSettings['botNames'];
  return {
    language: isLanguage(saved.language) ? saved.language : d.language,
    targetScore: pickNumber(saved, 'targetScore', d.targetScore, 1),
    trumpTeamWinPoints: pickNumber(saved, 'trumpTeamWinPoints', d.trumpTeamWinPoints),
    defenderWinPoints: pickNumber(saved, 'defenderWinPoints', d.defenderWinPoints),
    kapothiPoints: pickNumber(saved, 'kapothiPoints', d.kapothiPoints),
    tieBonus: pickNumber(saved, 'tieBonus', d.tieBonus),
    stackTieBonus: pickBoolean(saved, 'stackTieBonus', d.stackTieBonus),
    botDifficulty: pickOneOf(saved.botDifficulty, ['easy', 'medium', 'hard'], d.botDifficulty),
    speed: pickOneOf(saved.speed, ['slow', 'normal', 'fast'], d.speed),
    oneTapPlay: pickBoolean(saved, 'oneTapPlay', d.oneTapPlay),
    fourColorDeck: pickBoolean(saved, 'fourColorDeck', d.fourColorDeck),
    practice: {
      highlightLegal: pickBoolean(practice, 'highlightLegal', d.practice.highlightLegal),
      autoFeedback: pickBoolean(practice, 'autoFeedback', d.practice.autoFeedback),
      allowUndo: pickBoolean(practice, 'allowUndo', d.practice.allowUndo),
    },
    botNames,
    unlockAllLessons: pickBoolean(saved, 'unlockAllLessons', d.unlockAllLessons),
  };
}

/** The numeric house-rule settings that the Settings screen edits with steppers. */
export type NumericSetting =
  'targetScore' | 'trumpTeamWinPoints' | 'defenderWinPoints' | 'kapothiPoints' | 'tieBonus';

/** Stepper bounds for each numeric setting (inclusive). */
export const SETTING_BOUNDS: Readonly<Record<NumericSetting, { min: number; max: number }>> = {
  targetScore: { min: 1, max: 30 },
  trumpTeamWinPoints: { min: 0, max: 10 },
  defenderWinPoints: { min: 0, max: 10 },
  kapothiPoints: { min: 0, max: 10 },
  tieBonus: { min: 0, max: 10 },
};

/** Rounds a stepper value to a whole number and keeps it inside the setting's bounds. */
export function clampSetting(key: NumericSetting, value: number): number {
  const { min, max } = SETTING_BOUNDS[key];
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
