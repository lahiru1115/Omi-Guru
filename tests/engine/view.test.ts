import { describe, expect, it } from 'vitest';
import { SEATS } from '../../src/engine/rules';
import { applyAction, createGame } from '../../src/engine/stateMachine';
import type { CardId, GameState, Seat } from '../../src/engine/types';
import { getPlayerView } from '../../src/engine/view';
import { firstLegal, settings } from './helpers';

/** Every card id anywhere in a value (by walking its JSON). */
function cardIdsIn(value: unknown): Set<string> {
  return new Set([...JSON.stringify(value).matchAll(/"id":"([^"]+)"/g)].map((m) => m[1]!));
}

/** Cards that seat must not see: other players' hands and every held-back second block. */
function hiddenFrom(state: GameState, seat: Seat): CardId[] {
  const { hands, secondBlock } = state.round;
  return [
    ...SEATS.filter((s) => s !== seat).flatMap((s) => hands[s].map((c) => c.id)),
    ...secondBlock.flat().map((c) => c.id),
  ];
}

function checkAllSeats(state: GameState): void {
  for (const seat of SEATS) {
    const view = getPlayerView(state, seat);
    expect(view.hand).toEqual(state.round.hands[seat]);
    expect(view.handCounts).toEqual(state.round.hands.map((h) => h.length));
    const visible = cardIdsIn(view);
    for (const id of hiddenFrom(state, seat)) expect(visible.has(id)).toBe(false);
    expect(Object.keys(view)).not.toContain('secondBlock');
    expect(Object.keys(view)).not.toContain('rngState');
  }
}

describe('getPlayerView', () => {
  it("never contains another seat's cards, in any phase", () => {
    let s = createGame(settings(), 404);
    checkAllSeats(s);
    s = applyAction(s, { type: 'START_ROUND' });
    checkAllSeats(s); // CHOOSE_TRUMP: chooser sees only 4 cards
    expect(getPlayerView(s, s.round.trumpChooser).hand).toHaveLength(4);
    s = applyAction(s, { type: 'CHOOSE_TRUMP', seat: s.round.trumpChooser, suit: 'C' });
    checkAllSeats(s);
    s = applyAction(s, { type: 'DEAL_SECOND' });
    while (s.phase === 'PLAYING') {
      checkAllSeats(s);
      s = applyAction(s, { type: 'PLAY_CARD', seat: s.round.turn, cardId: firstLegal(s) });
    }
    checkAllSeats(s);
  });

  it('shows public information', () => {
    let s = applyAction(createGame(settings(), 5), { type: 'START_ROUND' });
    s = applyAction(s, { type: 'CHOOSE_TRUMP', seat: s.round.trumpChooser, suit: 'H' });
    s = applyAction(s, { type: 'DEAL_SECOND' });
    s = applyAction(s, { type: 'PLAY_CARD', seat: s.round.turn, cardId: firstLegal(s) });
    const v = getPlayerView(s, 0);
    expect(v).toMatchObject({
      seat: 0,
      trump: 'H',
      dealer: s.round.dealer,
      trumpChooser: s.round.trumpChooser,
      turn: s.round.turn,
      phase: 'PLAYING',
      scores: [0, 0],
      tricksWon: [0, 0],
    });
    expect(v.currentTrick).toEqual(s.round.currentTrick);
  });

  it('returns copies, so changing the view cannot change the state', () => {
    const s = applyAction(createGame(settings(), 5), { type: 'START_ROUND' });
    const before = JSON.stringify(s);
    const v = getPlayerView(s, 0);
    v.hand.pop();
    v.scores[0] = 99;
    v.currentTrick.plays.push({ seat: 0, card: { id: 'AS', suit: 'S', rank: 'A' } });
    expect(JSON.stringify(s)).toBe(before);
  });
});
