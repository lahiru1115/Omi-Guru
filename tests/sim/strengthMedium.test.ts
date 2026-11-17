// SPEC §12 strength check: Medium beats Easy in at least 60% of 2,000 games.
import { expect, it } from 'vitest';
import { winRate } from './runGame';

it('Medium beats Easy in at least 60% of 2,000 games', () => {
  const result = winRate('medium', 'easy', 2000, 1);
  console.log(
    `Medium vs Easy: ${result.wins}/${result.games} = ${(result.rate * 100).toFixed(1)}%`,
  );
  expect(result.rate).toBeGreaterThanOrEqual(0.6);
});
