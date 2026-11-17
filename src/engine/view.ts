// getPlayerView(state, seat): the hidden-information-safe view for bots and the coach. See SPEC §3.
import type { GameState, PlayerView, Seat, Trick } from './types';

function copyTrick(trick: Trick): Trick {
  const copy: Trick = { leader: trick.leader, plays: trick.plays.map((p) => ({ ...p })) };
  if (trick.winner !== undefined) copy.winner = trick.winner;
  return copy;
}

export function getPlayerView(state: GameState, seat: Seat): PlayerView {
  const { round } = state;
  const [h0, h1, h2, h3] = round.hands;
  return {
    seat,
    hand: [...round.hands[seat]],
    handCounts: [h0.length, h1.length, h2.length, h3.length],
    trump: round.trump,
    trumpChooser: round.trumpChooser,
    dealer: round.dealer,
    turn: round.turn,
    currentTrick: copyTrick(round.currentTrick),
    completedTricks: round.completedTricks.map(copyTrick),
    tricksWon: [...round.tricksWon],
    scores: [...state.scores],
    phase: state.phase,
  };
}
