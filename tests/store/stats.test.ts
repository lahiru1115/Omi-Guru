import { describe, expect, it } from 'vitest';
import type { RoundResult } from '../../src/engine/types';
import {
  applyStatsEvent,
  emptyStats,
  isEmptyStats,
  parseStats,
  percent,
  type StatsEvent,
} from '../../src/store/stats';

function round(over: Partial<RoundResult>): RoundResult {
  return {
    number: 1,
    dealer: 3,
    trumpChooser: 0,
    trump: 'S',
    tricksWon: [5, 3],
    winner: 0,
    points: 1,
    bonusApplied: 0,
    reason: 'TRUMP_TEAM_WIN',
    scoresAfter: [1, 0],
    ...over,
  };
}

function apply(events: StatsEvent[]) {
  return events.reduce(applyStatsEvent, emptyStats());
}

describe('stats reducer', () => {
  it('counts Real rounds, wins and the player trump calls', () => {
    const s = apply([
      { type: 'round', mode: 'real', result: round({}) },
      {
        type: 'round',
        mode: 'real',
        result: round({ trumpChooser: 0, winner: 1, reason: 'DEFENDER_WIN' }),
      },
      { type: 'round', mode: 'real', result: round({ trumpChooser: 2, winner: 0 }) },
      {
        type: 'round',
        mode: 'real',
        result: round({ trumpChooser: 0, winner: null, reason: 'TIE' }),
      },
    ]);
    expect(s.real.roundsPlayed).toBe(4);
    expect(s.real.roundsWon).toBe(2);
    // Only seat 0's calls count (not the partner's), and a tie is not a success.
    expect(s.real.trumpCalls).toBe(3);
    expect(s.real.trumpCallsWon).toBe(1);
  });

  it('counts කැපෝති for and against', () => {
    const s = apply([
      { type: 'round', mode: 'real', result: round({ reason: 'KAPOTHI', winner: 0 }) },
      { type: 'round', mode: 'real', result: round({ reason: 'KAPOTHI', winner: 1 }) },
      { type: 'round', mode: 'real', result: round({ reason: 'KAPOTHI', winner: 1 }) },
    ]);
    expect(s.real.kapothiFor).toBe(1);
    expect(s.real.kapothiAgainst).toBe(2);
  });

  it('ignores Practice rounds for the Real stats', () => {
    const s = apply([{ type: 'round', mode: 'practice', result: round({}) }]);
    expect(s).toEqual(emptyStats());
  });

  it('counts games per difficulty and Practice games separately', () => {
    const s = apply([
      { type: 'gameOver', mode: 'real', difficulty: 'easy', won: true },
      { type: 'gameOver', mode: 'real', difficulty: 'easy', won: false },
      { type: 'gameOver', mode: 'real', difficulty: 'hard', won: true },
      { type: 'gameOver', mode: 'practice', difficulty: 'medium', won: true },
    ]);
    expect(s.real.byDifficulty).toEqual({
      easy: { played: 2, won: 1 },
      medium: { played: 0, won: 0 },
      hard: { played: 1, won: 1 },
    });
    expect(s.practice.gamesPlayed).toBe(1);
  });

  it('counts hints and the coach match rate', () => {
    const s = apply([
      { type: 'hint' },
      { type: 'review', verdict: 'GOOD' },
      { type: 'review', verdict: 'OK' },
      { type: 'review', verdict: 'BETTER_EXISTS' },
      { type: 'review', verdict: 'GOOD' },
    ]);
    expect(s.practice).toEqual({ gamesPlayed: 0, hintsUsed: 1, movesReviewed: 4, movesGood: 2 });
    expect(percent(s.practice.movesGood, s.practice.movesReviewed)).toBe(50);
  });

  it('does not change the input', () => {
    const before = emptyStats();
    applyStatsEvent(before, { type: 'hint' });
    expect(before).toEqual(emptyStats());
  });
});

describe('parseStats', () => {
  it('round-trips valid stats', () => {
    const s = apply([
      { type: 'gameOver', mode: 'real', difficulty: 'medium', won: true },
      { type: 'review', verdict: 'GOOD' },
    ]);
    expect(parseStats(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('falls back to zeros for missing, bad or inconsistent values', () => {
    expect(parseStats(undefined)).toEqual(emptyStats());
    expect(parseStats({ v: 2 })).toEqual(emptyStats());
    const s = parseStats({
      v: 1,
      real: {
        byDifficulty: { easy: { played: 2, won: 5 }, hard: 'x' },
        roundsPlayed: -1,
        trumpCalls: 1.5,
      },
      practice: { hintsUsed: 3, movesReviewed: 1, movesGood: 4 },
    });
    expect(s.real.byDifficulty.easy).toEqual({ played: 2, won: 2 });
    expect(s.real.byDifficulty.hard).toEqual({ played: 0, won: 0 });
    expect(s.real.roundsPlayed).toBe(0);
    expect(s.real.trumpCalls).toBe(0);
    expect(s.practice).toEqual({ gamesPlayed: 0, hintsUsed: 3, movesReviewed: 1, movesGood: 1 });
  });
});

describe('helpers', () => {
  it('percent returns null with nothing to divide by', () => {
    expect(percent(0, 0)).toBeNull();
    expect(percent(1, 3)).toBe(33);
  });

  it('isEmptyStats', () => {
    expect(isEmptyStats(emptyStats())).toBe(true);
    expect(isEmptyStats(apply([{ type: 'hint' }]))).toBe(false);
  });
});
