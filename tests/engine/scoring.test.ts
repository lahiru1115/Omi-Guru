import { describe, expect, it } from 'vitest';
import { scoreRound } from '../../src/engine/scoring';
import type { Team } from '../../src/engine/types';
import { settings } from './helpers';

const s = settings();
const split = (team0: number): [number, number] => [team0, 8 - team0];

describe('scoreRound', () => {
  it.each([5, 6, 7])('trump team wins %i tricks → 1 point', (n) => {
    expect(scoreRound(split(n), 0, 0, s)).toMatchObject({
      winner: 0,
      points: 1,
      reason: 'TRUMP_TEAM_WIN',
    });
    expect(scoreRound(split(8 - n), 1, 0, s)).toMatchObject({ winner: 1, points: 1 });
  });

  it.each([5, 6, 7])('defenders win %i tricks → 2 points', (n) => {
    expect(scoreRound(split(n), 1, 0, s)).toMatchObject({
      winner: 0,
      points: 2,
      reason: 'DEFENDER_WIN',
    });
    expect(scoreRound(split(8 - n), 0, 0, s)).toMatchObject({ winner: 1, points: 2 });
  });

  it.each<[Team, Team]>([
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ])('කැපෝති for team %i (chooser team %i) → 3 points', (winner, chooser) => {
    const tricks: [number, number] = winner === 0 ? [8, 0] : [0, 8];
    expect(scoreRound(tricks, chooser, 0, s)).toMatchObject({
      winner,
      points: 3,
      reason: 'KAPOTHI',
    });
  });

  it('4–4 → 0 points and a pending tie bonus', () => {
    expect(scoreRound([4, 4], 0, 0, s)).toEqual({
      winner: null,
      points: 0,
      pendingBonus: 1,
      bonusApplied: 0,
      reason: 'TIE',
    });
  });

  it('adds the pending bonus to the next winner and resets it', () => {
    const r = scoreRound([6, 2], 1, 1, s);
    expect(r).toMatchObject({ winner: 0, points: 3, pendingBonus: 0, bonusApplied: 1 });
  });

  it('does not stack the bonus by default', () => {
    expect(scoreRound([4, 4], 0, 1, s).pendingBonus).toBe(1);
  });

  it('stacks the bonus when stackTieBonus is on', () => {
    const stacking = settings({ stackTieBonus: true });
    expect(scoreRound([4, 4], 0, 1, stacking).pendingBonus).toBe(2);
    expect(scoreRound([4, 4], 0, 2, stacking).pendingBonus).toBe(3);
  });

  it('uses the settings values, not literals', () => {
    const custom = settings({
      trumpTeamWinPoints: 10,
      defenderWinPoints: 20,
      kapothiPoints: 30,
      tieBonus: 5,
    });
    expect(scoreRound([5, 3], 0, 0, custom).points).toBe(10);
    expect(scoreRound([5, 3], 1, 0, custom).points).toBe(20);
    expect(scoreRound([0, 8], 1, 0, custom).points).toBe(30);
    expect(scoreRound([4, 4], 1, 0, custom).pendingBonus).toBe(5);
  });
});
