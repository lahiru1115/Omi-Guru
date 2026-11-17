// Per-decision seeds for bots. A bot mixes its own seed with a fingerprint of the view, so the same
// game always plays out the same way (even after save and Continue) without the bot keeping state.
import type { PlayerView } from '../engine/types';

/** FNV-1a over a string: a small, stable 32-bit hash. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Public facts plus the bot's own hand: different for every decision in a game. */
export function fingerprint(view: PlayerView): number {
  const played = view.completedTricks.length * 4 + view.currentTrick.plays.length;
  const hand = view.hand.map((c) => c.id).join(',');
  const table = view.currentTrick.plays.map((p) => p.card.id).join(',');
  return hashString(
    `${view.seat}|${view.dealer}|${view.scores.join('-')}|${played}|${hand}|${table}`,
  );
}

/** The seed for one decision of a bot. */
export function decisionSeed(botSeed: number, view: PlayerView): number {
  return (botSeed ^ fingerprint(view)) >>> 0;
}
