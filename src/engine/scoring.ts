// scoreRound with the tie bonus, using GameSettings values. See SPEC §2.4 and the reference in §2.5.
import type { GameSettings, ScoreReason, Team } from './types';

export type RoundScore =
  | { winner: null; points: 0; pendingBonus: number; bonusApplied: 0; reason: 'TIE' }
  | {
      winner: Team;
      points: number; // base + bonusApplied
      pendingBonus: 0;
      bonusApplied: number;
      reason: Exclude<ScoreReason, 'TIE'>;
    };

type ScoringSettings = Pick<
  GameSettings,
  'trumpTeamWinPoints' | 'defenderWinPoints' | 'kapothiPoints' | 'tieBonus' | 'stackTieBonus'
>;

export function scoreRound(
  tricks: readonly [number, number],
  chooserTeam: Team,
  pendingBonus: number,
  s: ScoringSettings,
): RoundScore {
  if (tricks[0] === 4) {
    return {
      winner: null,
      points: 0,
      pendingBonus: s.stackTieBonus ? pendingBonus + s.tieBonus : s.tieBonus,
      bonusApplied: 0,
      reason: 'TIE',
    };
  }
  const winner: Team = tricks[0] >= 5 ? 0 : 1;
  const kapothi = tricks[winner] === 8;
  const base = kapothi
    ? s.kapothiPoints
    : winner === chooserTeam
      ? s.trumpTeamWinPoints
      : s.defenderWinPoints;
  return {
    winner,
    points: base + pendingBonus,
    pendingBonus: 0,
    bonusApplied: pendingBonus,
    reason: kapothi ? 'KAPOTHI' : winner === chooserTeam ? 'TRUMP_TEAM_WIN' : 'DEFENDER_WIN',
  };
}
