// SPEC §12 strength check: Hard beats Easy in at least 70% of 2,000 games.
// Also logs Hard vs Medium for information (no threshold in the SPEC).
import { expect, it } from 'vitest';
import { winRate } from './runGame';

it('Hard beats Easy in at least 70% of 2,000 games', () => {
  const result = winRate('hard', 'easy', 2000, 1);
  console.log(`Hard vs Easy: ${result.wins}/${result.games} = ${(result.rate * 100).toFixed(1)}%`);
  expect(result.rate).toBeGreaterThanOrEqual(0.7);
});

it('Hard vs Medium (informational, 400 games)', () => {
  const result = winRate('hard', 'medium', 400, 50_000);
  console.log(
    `Hard vs Medium: ${result.wins}/${result.games} = ${(result.rate * 100).toFixed(1)}%`,
  );
  expect(result.games).toBe(400);
});
