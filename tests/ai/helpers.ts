// Builds PlayerViews for AI and coach scenario tests from card-id strings.
import type { PlayerView, Seat, Suit, Trick } from '../../src/engine/types';
import { ids } from '../engine/helpers';

export { ids, trick } from '../engine/helpers';

export type ViewSpec = {
  seat?: Seat;
  hand: string;
  trump?: Suit;
  chooser?: Seat;
  completed?: Trick[];
  current?: Trick;
};

/** A PlayerView for `seat` (default 0). Hand counts follow from the tricks played so far. */
export function viewFrom(spec: ViewSpec): PlayerView {
  const seat = spec.seat ?? 0;
  const chooser = spec.chooser ?? 1;
  const completed = spec.completed ?? [];
  const current = spec.current ?? { leader: seat, plays: [] };
  const hand = ids(spec.hand);
  const counts: [number, number, number, number] = [8, 8, 8, 8];
  for (const t of [...completed, current]) for (const p of t.plays) counts[p.seat]--;
  counts[seat] = hand.length;
  const tricksWon: [number, number] = [0, 0];
  for (const t of completed) if (t.winner !== undefined) tricksWon[t.winner % 2]++;
  return {
    seat,
    hand,
    handCounts: counts,
    trump: spec.trump ?? 'S',
    trumpChooser: chooser,
    dealer: ((chooser + 3) % 4) as Seat,
    turn: seat,
    currentTrick: current,
    completedTricks: completed,
    tricksWon,
    scores: [0, 0],
    phase: 'PLAYING',
  };
}

/** A completed trick with its winner set. */
export function done(t: Trick, winner: Seat): Trick {
  return { ...t, winner };
}
