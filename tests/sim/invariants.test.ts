// SPEC §12 simulation: seeded bot games must never break the rules or the scoring.
// runGame() throws on the first broken invariant (illegal card, not 8 tricks, a card played twice,
// scores that don't match the round results, or a game that never ends).
import { describe, expect, it } from 'vitest';
import { runGame, type LineUp } from './runGame';

const LINE_UPS: readonly LineUp[] = [
  ['easy', 'easy', 'easy', 'easy'],
  ['medium', 'medium', 'medium', 'medium'],
  ['medium', 'easy', 'medium', 'easy'],
  ['easy', 'medium', 'easy', 'medium'],
  ['easy', 'medium', 'medium', 'easy'],
];

describe('simulation invariants (SPEC §12)', () => {
  it('10,000 seeded Easy/Medium games: all rules and scores hold, and every game ends', () => {
    let rounds = 0;
    for (let i = 0; i < 10_000; i++) {
      const lineUp = LINE_UPS[i % LINE_UPS.length] as LineUp;
      const result = runGame(100_000 + i, lineUp);
      expect(result.scores[result.winner]).toBeGreaterThanOrEqual(10);
      rounds += result.rounds;
    }
    console.log(`invariants: 10,000 games, ${rounds} rounds, all checks passed`);
  });

  it('200 seeded games with Hard bots: all rules and scores hold', () => {
    const hardLineUps: readonly LineUp[] = [
      ['hard', 'hard', 'hard', 'hard'],
      ['hard', 'easy', 'hard', 'easy'],
      ['medium', 'hard', 'medium', 'hard'],
      ['hard', 'medium', 'easy', 'hard'],
    ];
    for (let i = 0; i < 200; i++) {
      const result = runGame(500_000 + i, hardLineUps[i % hardLineUps.length] as LineUp);
      expect(result.scores[result.winner]).toBeGreaterThanOrEqual(10);
    }
  });
});
