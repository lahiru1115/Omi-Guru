// Splits lesson/rules text into plain text, card tokens like [AS] / [10H] and suit tokens like [S].
// The tokens are the same in every language; the UI draws them as small coloured cards or pips.
import type { CardId, Suit } from '../engine/types';

export type TextPart =
  { kind: 'text'; text: string } | { kind: 'card'; id: CardId } | { kind: 'suit'; suit: Suit };

export const TOKEN_PATTERN = /\[(10|[AKQJ987])?([SHDC])\]/g;

export function parseTokens(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ kind: 'text', text: text.slice(last, index) });
    const rank = match[1];
    const suit = match[2] as Suit;
    parts.push(rank ? { kind: 'card', id: `${rank}${suit}` as CardId } : { kind: 'suit', suit });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}

/** Every token in a text, in order (e.g. ["AS", "H"]), for the si/en content test. */
export function tokensOf(text: string): string[] {
  return [...text.matchAll(TOKEN_PATTERN)].map((m) => `${m[1] ?? ''}${m[2]}`);
}
