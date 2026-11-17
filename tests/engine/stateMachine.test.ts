import { describe, expect, it } from 'vitest';
import { getLegalCards, nextSeat } from '../../src/engine/rules';
import {
  applyAction,
  createGame,
  createRoundFromPreset,
  IllegalActionError,
  type IllegalActionCode,
} from '../../src/engine/stateMachine';
import type { Action, GameState, RoundPreset } from '../../src/engine/types';
import {
  dealAndChoose,
  deepFreeze,
  firstLegal,
  playFullGame,
  playOutRound,
  playPreset,
  PRESETS,
  settings,
} from './helpers';

function expectIllegal(state: GameState, action: Action, code: IllegalActionCode): void {
  try {
    applyAction(state, action);
  } catch (e) {
    expect(e).toBeInstanceOf(IllegalActionError);
    expect((e as IllegalActionError).code).toBe(code);
    return;
  }
  throw new Error(`expected ${code}`);
}

describe('createGame', () => {
  it('starts in DEAL_FIRST with a seeded dealer and the chooser = next(dealer)', () => {
    const g = createGame(settings(), 1);
    expect(g.phase).toBe('DEAL_FIRST');
    expect(g.scores).toEqual([0, 0]);
    expect(g.round.number).toBe(1);
    expect(g.round.trumpChooser).toBe(nextSeat(g.round.dealer));
    expect(createGame(settings(), 1)).toEqual(g);
  });

  it('chooses different first dealers across seeds', () => {
    const dealers = new Set(
      Array.from({ length: 40 }, (_, i) => createGame(settings(), i).round.dealer),
    );
    expect(dealers.size).toBe(4);
  });
});

describe('deal and trump choice', () => {
  it('the trump chooser sees 4 cards, chooses, then everyone has 8', () => {
    let s = applyAction(createGame(settings(), 11), { type: 'START_ROUND' });
    expect(s.phase).toBe('CHOOSE_TRUMP');
    expect(s.round.hands.map((h) => h.length)).toEqual([4, 4, 4, 4]);
    const chooser = s.round.trumpChooser;
    expect(s.round.turn).toBe(chooser);

    s = applyAction(s, { type: 'CHOOSE_TRUMP', seat: chooser, suit: 'H' });
    expect(s.phase).toBe('DEAL_SECOND');
    expect(s.round.trump).toBe('H');
    expect(s.round.hands.map((h) => h.length)).toEqual([4, 4, 4, 4]);

    s = applyAction(s, { type: 'DEAL_SECOND' });
    expect(s.phase).toBe('PLAYING');
    expect(s.round.hands.map((h) => h.length)).toEqual([8, 8, 8, 8]);
    expect(new Set(s.round.hands.flat().map((c) => c.id)).size).toBe(32);
  });

  it('only the trump chooser may choose trumps', () => {
    const s = applyAction(createGame(settings(), 11), { type: 'START_ROUND' });
    const other = nextSeat(s.round.trumpChooser);
    expectIllegal(s, { type: 'CHOOSE_TRUMP', seat: other, suit: 'S' }, 'NOT_TRUMP_CHOOSER');
  });

  it('the trump chooser leads the first trick', () => {
    for (let seed = 0; seed < 8; seed++) {
      const s = dealAndChoose(createGame(settings(), seed));
      const chooser = s.round.trumpChooser;
      expect(s.round.turn).toBe(chooser);
      expect(s.round.currentTrick.leader).toBe(chooser);
      const notChooser = nextSeat(chooser);
      const card = s.round.hands[notChooser][0]!;
      expectIllegal(s, { type: 'PLAY_CARD', seat: notChooser, cardId: card.id }, 'NOT_YOUR_TURN');
    }
  });
});

describe('illegal actions', () => {
  const playing = dealAndChoose(createGame(settings(), 3));

  it('rejects actions in the wrong phase', () => {
    const fresh = createGame(settings(), 3);
    expectIllegal(fresh, { type: 'DEAL_SECOND' }, 'WRONG_PHASE');
    expectIllegal(fresh, { type: 'NEXT_ROUND' }, 'WRONG_PHASE');
    expectIllegal(fresh, { type: 'PLAY_CARD', seat: 0, cardId: 'AS' }, 'WRONG_PHASE');
    expectIllegal(playing, { type: 'START_ROUND' }, 'WRONG_PHASE');
    expectIllegal(playing, { type: 'CHOOSE_TRUMP', seat: 0, suit: 'S' }, 'WRONG_PHASE');
  });

  it('rejects a card not in hand', () => {
    const seat = playing.round.turn;
    const elsewhere = playing.round.hands[nextSeat(seat)][0]!;
    expectIllegal(playing, { type: 'PLAY_CARD', seat, cardId: elsewhere.id }, 'CARD_NOT_IN_HAND');
  });

  it('rejects a card that does not follow suit', () => {
    // Tie preset: seat 1 holds spades and hearts, so after a spade lead it must play a spade.
    let s = createRoundFromPreset(createGame(settings(), 1), PRESETS.tie);
    s = applyAction(s, { type: 'PLAY_CARD', seat: 0, cardId: 'AS' });
    expectIllegal(s, { type: 'PLAY_CARD', seat: 1, cardId: 'AH' }, 'MUST_FOLLOW_SUIT');
    expect(() => applyAction(s, { type: 'PLAY_CARD', seat: 1, cardId: '7S' })).not.toThrow();
  });
});

describe('a full round', () => {
  it('plays 8 tricks, every card once, winners lead the next trick', () => {
    const start = dealAndChoose(createGame(settings(), 2024));
    const end = playOutRound(start);
    const { completedTricks, tricksWon, hands, trumpChooser } = end.round;

    expect(completedTricks).toHaveLength(8);
    expect(tricksWon[0] + tricksWon[1]).toBe(8);
    expect(hands.every((h) => h.length === 0)).toBe(true);
    const played = completedTricks.flatMap((t) => t.plays.map((p) => p.card.id));
    expect(new Set(played).size).toBe(32);

    expect(completedTricks[0]!.leader).toBe(trumpChooser);
    for (let i = 1; i < 8; i++) {
      expect(completedTricks[i]!.leader).toBe(completedTricks[i - 1]!.winner);
    }
    for (const t of completedTricks) {
      expect(t.plays.map((p) => p.seat)).toEqual([0, 1, 2, 3].map((k) => (t.leader + k) % 4));
    }

    expect(['ROUND_END', 'GAME_OVER']).toContain(end.phase);
    expect(end.roundHistory).toHaveLength(1);
    const r = end.roundHistory[0]!;
    expect(end.scores).toEqual(r.scoresAfter);
    expect(r.tricksWon).toEqual(tricksWon);
  });

  it('every card played was legal at the time', () => {
    let s = dealAndChoose(createGame(settings(), 77));
    while (s.phase === 'PLAYING') {
      const legal = getLegalCards(s.round.hands[s.round.turn], s.round.currentTrick);
      const id = firstLegal(s);
      expect(legal.map((c) => c.id)).toContain(id);
      s = applyAction(s, { type: 'PLAY_CARD', seat: s.round.turn, cardId: id });
    }
  });
});

describe('scoring through the engine', () => {
  const base = createGame(settings(), 5);

  it('කැපෝති for the trump team scores 3', () => {
    const s = playPreset(base, PRESETS.kapothiTeam0);
    expect(s.round.tricksWon).toEqual([8, 0]);
    expect(s.roundHistory.at(-1)).toMatchObject({ reason: 'KAPOTHI', winner: 0, points: 3 });
    expect(s.scores).toEqual([3, 0]);
    expect(s.phase).toBe('ROUND_END');
  });

  it('defenders winning scores 2', () => {
    const s = playPreset(base, PRESETS.defendersWin);
    expect(s.round.tricksWon).toEqual([3, 5]);
    expect(s.scores).toEqual([0, 2]);
  });

  it('a 4–4 tie gives the bonus to the next winner, then resets it', () => {
    let s = playPreset(base, PRESETS.tie);
    expect(s.round.tricksWon).toEqual([4, 4]);
    expect(s.scores).toEqual([0, 0]);
    expect(s.pendingTieBonus).toBe(1);
    expect(s.roundHistory.at(-1)!.reason).toBe('TIE');

    // Second tie: by default the bonus does not stack.
    s = playPreset(applyAction(s, { type: 'NEXT_ROUND' }), PRESETS.tie);
    expect(s.pendingTieBonus).toBe(1);

    s = playPreset(applyAction(s, { type: 'NEXT_ROUND' }), PRESETS.defendersWin);
    expect(s.scores).toEqual([0, 3]); // 2 + 1 bonus
    expect(s.roundHistory.at(-1)!.bonusApplied).toBe(1);
    expect(s.pendingTieBonus).toBe(0);

    s = playPreset(applyAction(s, { type: 'NEXT_ROUND' }), PRESETS.defendersWin);
    expect(s.scores).toEqual([0, 5]); // no bonus any more
  });

  it('stacks the tie bonus when the setting is on', () => {
    let s = playPreset(createGame(settings({ stackTieBonus: true }), 5), PRESETS.tie);
    s = playPreset(applyAction(s, { type: 'NEXT_ROUND' }), PRESETS.tie);
    expect(s.pendingTieBonus).toBe(2);
    s = playPreset(applyAction(s, { type: 'NEXT_ROUND' }), PRESETS.kapothiTeam0);
    expect(s.scores).toEqual([5, 0]);
  });

  it('ends the game when a team reaches the target', () => {
    const nearlyDone: GameState = { ...base, scores: [9, 0] };
    const s = playPreset(nearlyDone, PRESETS.kapothiTeam0);
    expect(s.scores).toEqual([12, 0]);
    expect(s.phase).toBe('GAME_OVER');
    expectIllegal(s, { type: 'NEXT_ROUND' }, 'WRONG_PHASE');
    expectIllegal(s, { type: 'START_ROUND' }, 'WRONG_PHASE');
  });

  it('ends the game at exactly the target, and not below it', () => {
    const exact = playPreset({ ...base, scores: [7, 0] }, PRESETS.kapothiTeam0);
    expect(exact.scores).toEqual([10, 0]);
    expect(exact.phase).toBe('GAME_OVER');
    const below = playPreset({ ...base, scores: [6, 0] }, PRESETS.kapothiTeam0);
    expect(below.phase).toBe('ROUND_END');
  });

  it('respects a custom target score', () => {
    const s = playPreset(createGame(settings({ targetScore: 3 }), 5), PRESETS.kapothiTeam0);
    expect(s.phase).toBe('GAME_OVER');
  });
});

describe('dealer rotation', () => {
  it('passes the deal to next(dealer) every round', () => {
    let s = createGame(settings(), 9);
    const firstDealer = s.round.dealer;
    for (let i = 0; i < 6; i++) {
      expect(s.round.dealer).toBe((firstDealer + i) % 4);
      expect(s.round.trumpChooser).toBe((firstDealer + i + 1) % 4);
      expect(s.round.number).toBe(i + 1);
      s = playOutRound(dealAndChoose(s));
      if (s.phase === 'GAME_OVER') break;
      s = applyAction(s, { type: 'NEXT_ROUND' });
      expect(s.phase).toBe('DEAL_FIRST');
    }
  });

  it('records the rotation in the round history of a full game', () => {
    const g = playFullGame(31);
    g.roundHistory.forEach((r, i) => {
      expect(r.dealer).toBe((g.roundHistory[0]!.dealer + i) % 4);
      expect(r.trumpChooser).toBe(nextSeat(r.dealer));
    });
  });
});

describe('full games', () => {
  it.each([1, 2, 3, 4, 5])('seed %i: ends with a winner and consistent scores', (seed) => {
    const g = playFullGame(seed);
    expect(g.phase).toBe('GAME_OVER');
    expect(Math.max(...g.scores)).toBeGreaterThanOrEqual(g.settings.targetScore);
    const totals = [0, 0];
    for (const r of g.roundHistory) if (r.winner !== null) totals[r.winner]! += r.points;
    expect(totals).toEqual(g.scores);
  });

  it('is deterministic: the same seed gives the same game', () => {
    expect(playFullGame(123)).toEqual(playFullGame(123));
  });
});

describe('immutability', () => {
  it('never mutates the input state', () => {
    let s = deepFreeze(createGame(settings(), 8));
    const step = (action: Action) => {
      const before = JSON.stringify(s);
      const next = applyAction(s, action);
      expect(JSON.stringify(s)).toBe(before);
      s = deepFreeze(next);
    };
    step({ type: 'START_ROUND' });
    step({ type: 'CHOOSE_TRUMP', seat: s.round.trumpChooser, suit: 'D' });
    step({ type: 'DEAL_SECOND' });
    while (s.phase === 'PLAYING')
      step({ type: 'PLAY_CARD', seat: s.round.turn, cardId: firstLegal(s) });
    if (s.phase === 'ROUND_END') step({ type: 'NEXT_ROUND' });
  });
});

describe('createRoundFromPreset', () => {
  const base = createGame(settings(), 1);

  it('with a trump: ready to play, the chooser leads', () => {
    const s = createRoundFromPreset(base, PRESETS.tie);
    expect(s.phase).toBe('PLAYING');
    expect(s.round.dealer).toBe(3);
    expect(s.round.trumpChooser).toBe(0);
    expect(s.round.turn).toBe(0);
    expect(s.round.trump).toBe('S');
    expect(s.round.hands[0].map((c) => c.id)).toEqual(PRESETS.tie.hands[0]);
  });

  it('without a trump: waits for the chooser with 4 cards each', () => {
    const { trump: _ignored, ...noTrump } = PRESETS.tie;
    void _ignored;
    let s = createRoundFromPreset(base, noTrump);
    expect(s.phase).toBe('CHOOSE_TRUMP');
    expect(s.round.hands[0].map((c) => c.id)).toEqual(PRESETS.tie.hands[0].slice(0, 4));
    s = applyAction(s, { type: 'CHOOSE_TRUMP', seat: 0, suit: 'H' });
    s = applyAction(s, { type: 'DEAL_SECOND' });
    expect(s.round.hands[0].map((c) => c.id)).toEqual(PRESETS.tie.hands[0]);
  });

  it('keeps scores and the pending bonus', () => {
    const s = createRoundFromPreset({ ...base, scores: [4, 2], pendingTieBonus: 1 }, PRESETS.tie);
    expect(s.scores).toEqual([4, 2]);
    expect(s.pendingTieBonus).toBe(1);
  });

  it('rejects duplicate cards and wrong counts', () => {
    const dup: RoundPreset = {
      ...PRESETS.tie,
      hands: [
        PRESETS.tie.hands[0],
        [...PRESETS.tie.hands[1].slice(0, 7), 'AS'],
        PRESETS.tie.hands[2],
        PRESETS.tie.hands[3],
      ],
    };
    expect(() => createRoundFromPreset(base, dup)).toThrow();
    const short: RoundPreset = {
      ...PRESETS.tie,
      hands: [
        PRESETS.tie.hands[0].slice(0, 7),
        PRESETS.tie.hands[1],
        PRESETS.tie.hands[2],
        PRESETS.tie.hands[3],
      ],
    };
    expect(() => createRoundFromPreset(base, short)).toThrow();
  });
});
