import { describe, expect, it } from 'vitest';
import { hintBubble, reviewBubble } from '../../src/coach/feedback';
import { getHint } from '../../src/coach/hintEngine';
import { reviewMove } from '../../src/coach/review';
import { trick, viewFrom } from '../ai/helpers';

describe('coach bubbles (SPEC §6.1)', () => {
  // Partner (seat 2) leads A♣ and is winning; I hold K♣ and 8♣.
  const view = viewFrom({ hand: 'KC 8C 9H', current: trick(2, 'AC', '7C'), trump: 'S' });

  it('the hint bubble explains the suggested card', () => {
    const hint = getHint(view);
    expect(hint.cardId).toBe('8C');
    expect(hintBubble(view, hint)).toEqual({
      lines: [{ key: 'reason.PARTNER_WINNING', params: {} }],
    });
  });

  it('a good card gets the GOOD header and the reasons', () => {
    const bubble = reviewBubble(view, '8C', reviewMove(view, '8C'));
    expect(bubble.header).toEqual({ key: 'verdict.GOOD', params: {} });
    expect(bubble.lines.map((l) => l.key)).toEqual(['reason.PARTNER_WINNING']);
  });

  it('a worse card names the better card, the mistake and the reason', () => {
    // With A♣ played, K♣ is the highest club left: throwing it under partner's A♣ wastes it.
    const bubble = reviewBubble(view, 'KC', reviewMove(view, 'KC'));
    expect(bubble.header).toEqual({ key: 'verdict.BETTER_EXISTS', params: { card: '8C' } });
    expect(bubble.lines).toEqual([
      { key: 'mistake.THREW_MASTER', params: { card: 'KC' } },
      { key: 'reason.PARTNER_WINNING', params: {} },
    ]);
  });

  it('an OK card gets only the header', () => {
    const review = {
      verdict: 'OK' as const,
      bestCardId: '8C' as const,
      bestReasons: [],
      mistakes: [],
    };
    expect(reviewBubble(view, '8C', review)).toEqual({
      header: { key: 'verdict.OK', params: {} },
      lines: [],
    });
  });
});
