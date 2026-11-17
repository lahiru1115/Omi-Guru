// Player statistics (SPEC §10.3), saved to omi.stats.v1. Pure data and pure functions; the Zustand
// wrapper is statsStore.ts.
//
// Split by mode:
// - Real games: games played/won per difficulty, rounds, කැපෝති for/against and trump-call success.
// - Practice: games finished, hints used and the coach match rate (% of the player's moves rated GOOD).
// Lessons are not counted. A game counts once it reaches GAME_OVER, so abandoned games are not counted.
import type { Verdict } from '../coach/review';
import type { BotDifficulty, RoundResult } from '../engine/types';
import type { PlayMode } from './gameStore';
import { isRecord } from './mergeSettings';

export type GameCount = { played: number; won: number };

export type RealStats = {
  byDifficulty: Record<BotDifficulty, GameCount>;
  roundsPlayed: number;
  roundsWon: number;
  kapothiFor: number;
  kapothiAgainst: number;
  /** Rounds where the player (seat 0) chose trumps, and how many of those their team won. */
  trumpCalls: number;
  trumpCallsWon: number;
};

export type PracticeStats = {
  gamesPlayed: number;
  hintsUsed: number;
  movesReviewed: number;
  movesGood: number;
};

export type StatsData = { v: 1; real: RealStats; practice: PracticeStats };

export type StatsEvent =
  | { type: 'round'; mode: PlayMode; result: RoundResult }
  | { type: 'gameOver'; mode: PlayMode; difficulty: BotDifficulty; won: boolean }
  | { type: 'hint' }
  | { type: 'review'; verdict: Verdict };

const DIFFICULTIES: readonly BotDifficulty[] = ['easy', 'medium', 'hard'];

export function emptyStats(): StatsData {
  return {
    v: 1,
    real: {
      byDifficulty: {
        easy: { played: 0, won: 0 },
        medium: { played: 0, won: 0 },
        hard: { played: 0, won: 0 },
      },
      roundsPlayed: 0,
      roundsWon: 0,
      kapothiFor: 0,
      kapothiAgainst: 0,
      trumpCalls: 0,
      trumpCallsWon: 0,
    },
    practice: { gamesPlayed: 0, hintsUsed: 0, movesReviewed: 0, movesGood: 0 },
  };
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

/** Validates saved stats field by field. Anything unreadable counts as 0. */
export function parseStats(value: unknown): StatsData {
  const stats = emptyStats();
  if (!isRecord(value) || value.v !== 1) return stats;
  const real = isRecord(value.real) ? value.real : {};
  const by = isRecord(real.byDifficulty) ? real.byDifficulty : {};
  for (const d of DIFFICULTIES) {
    const entry = isRecord(by[d]) ? by[d] : {};
    const played = count(entry.played);
    stats.real.byDifficulty[d] = { played, won: Math.min(count(entry.won), played) };
  }
  stats.real.roundsPlayed = count(real.roundsPlayed);
  stats.real.roundsWon = Math.min(count(real.roundsWon), stats.real.roundsPlayed);
  stats.real.kapothiFor = count(real.kapothiFor);
  stats.real.kapothiAgainst = count(real.kapothiAgainst);
  stats.real.trumpCalls = count(real.trumpCalls);
  stats.real.trumpCallsWon = Math.min(count(real.trumpCallsWon), stats.real.trumpCalls);
  const practice = isRecord(value.practice) ? value.practice : {};
  stats.practice.gamesPlayed = count(practice.gamesPlayed);
  stats.practice.hintsUsed = count(practice.hintsUsed);
  stats.practice.movesReviewed = count(practice.movesReviewed);
  stats.practice.movesGood = Math.min(count(practice.movesGood), stats.practice.movesReviewed);
  return stats;
}

/** Returns new stats with one event applied. Events that a mode doesn't track are ignored. */
export function applyStatsEvent(stats: StatsData, event: StatsEvent): StatsData {
  switch (event.type) {
    case 'round': {
      if (event.mode !== 'real') return stats;
      const { result } = event;
      const r = stats.real;
      const kapothi = result.reason === 'KAPOTHI';
      const playerCalled = result.trumpChooser === 0;
      return {
        ...stats,
        real: {
          ...r,
          roundsPlayed: r.roundsPlayed + 1,
          roundsWon: r.roundsWon + (result.winner === 0 ? 1 : 0),
          kapothiFor: r.kapothiFor + (kapothi && result.winner === 0 ? 1 : 0),
          kapothiAgainst: r.kapothiAgainst + (kapothi && result.winner === 1 ? 1 : 0),
          trumpCalls: r.trumpCalls + (playerCalled ? 1 : 0),
          trumpCallsWon: r.trumpCallsWon + (playerCalled && result.winner === 0 ? 1 : 0),
        },
      };
    }
    case 'gameOver': {
      if (event.mode === 'practice') {
        return {
          ...stats,
          practice: { ...stats.practice, gamesPlayed: stats.practice.gamesPlayed + 1 },
        };
      }
      const before = stats.real.byDifficulty[event.difficulty];
      return {
        ...stats,
        real: {
          ...stats.real,
          byDifficulty: {
            ...stats.real.byDifficulty,
            [event.difficulty]: {
              played: before.played + 1,
              won: before.won + (event.won ? 1 : 0),
            },
          },
        },
      };
    }
    case 'hint':
      return {
        ...stats,
        practice: { ...stats.practice, hintsUsed: stats.practice.hintsUsed + 1 },
      };
    case 'review':
      return {
        ...stats,
        practice: {
          ...stats.practice,
          movesReviewed: stats.practice.movesReviewed + 1,
          movesGood: stats.practice.movesGood + (event.verdict === 'GOOD' ? 1 : 0),
        },
      };
  }
}

/** A whole-number percentage, or null when there is nothing to divide by. */
export function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

/** True when nothing has been recorded yet. */
export function isEmptyStats(stats: StatsData): boolean {
  const r = stats.real;
  return (
    DIFFICULTIES.every((d) => r.byDifficulty[d].played === 0) &&
    r.roundsPlayed === 0 &&
    stats.practice.gamesPlayed === 0 &&
    stats.practice.hintsUsed === 0 &&
    stats.practice.movesReviewed === 0
  );
}
