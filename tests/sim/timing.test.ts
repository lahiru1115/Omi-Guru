// SPEC §12: Hard bot decision time p95 <= 150 ms on desktop (check an iPhone manually).
import { expect, it } from 'vitest';
import { percentile, runGame } from './runGame';

it('Hard bot decisions: p95 <= 150 ms', () => {
  const times: number[] = [];
  for (let i = 0; i < 20; i++) {
    times.push(
      ...runGame(900_000 + i, ['hard', 'hard', 'hard', 'hard'], { timeDifficulty: 'hard' })
        .decisionTimes,
    );
  }
  const p50 = percentile(times, 50);
  const p95 = percentile(times, 95);
  const max = Math.max(...times);
  console.log(
    `Hard decision time over ${times.length} decisions: p50 ${p50.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms, max ${max.toFixed(2)} ms`,
  );
  expect(times.length).toBeGreaterThanOrEqual(1000);
  expect(p95).toBeLessThanOrEqual(150);
});
