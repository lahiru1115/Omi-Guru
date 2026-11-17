// Trump choice for Medium, Hard and the coach (SPEC §4.2): for each suit in the first 4 cards,
// score = 2 × count + points (A=4, K=3, Q=2, J=1, the rest 0). The highest score wins; a tie goes to
// the suit with the higher top card. (Easy picks the longest suit instead; see easyBot.ts.)
import { compareRank, SUITS } from '../engine/cards';
import type { Card, Rank, Suit } from '../engine/types';

export type SuitScore = {
  suit: Suit;
  count: number;
  points: number;
  score: number;
  top: Card | null;
};

const HIGH_CARD_POINTS: Readonly<Partial<Record<Rank, number>>> = { A: 4, K: 3, Q: 2, J: 1 };

export function highCardPoints(card: Card): number {
  return HIGH_CARD_POINTS[card.rank] ?? 0;
}

/** Every suit's score, best first. Suits with the same score and top card keep SUITS order. */
export function scoreSuits(hand: readonly Card[]): SuitScore[] {
  const scores = SUITS.map((suit): SuitScore => {
    const cards = hand.filter((c) => c.suit === suit);
    const points = cards.reduce((sum, c) => sum + highCardPoints(c), 0);
    const top = cards.reduce<Card | null>(
      (hi, c) => (hi === null || compareRank(c, hi) > 0 ? c : hi),
      null,
    );
    return { suit, count: cards.length, points, score: 2 * cards.length + points, top };
  });
  return scores.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.top === null || b.top === null) return a.top === null ? (b.top === null ? 0 : 1) : -1;
    return compareRank(b.top, a.top);
  });
}

export function chooseTrumpSuit(hand: readonly Card[]): Suit {
  return scoreSuits(hand)[0]?.suit ?? 'S';
}
