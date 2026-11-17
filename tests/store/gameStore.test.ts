import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Bot } from '../../src/ai/bot';
import { createEasyBot } from '../../src/ai/easyBot';
import { getLegalCards } from '../../src/engine/rules';
import { DEFAULT_GAME_SETTINGS, type GameSettings, type PlayerView } from '../../src/engine/types';
import { createGameStore, HUMAN, type GameStoreDeps } from '../../src/store/gameStore';
import { BOT_DELAY_MS, COLLECT_MS, TRICK_HOLD_MS } from '../../src/store/pacing';
import type { SavedGame } from '../../src/store/savedGame';
import type { StatsEvent } from '../../src/store/stats';

function setup(overrides: Partial<GameSettings> = {}, extra: Partial<GameStoreDeps> = {}) {
  let saved: SavedGame | null = null;
  const saves: SavedGame[] = [];
  const views: PlayerView[] = [];
  const settings: GameSettings = { ...DEFAULT_GAME_SETTINGS, ...overrides };
  const createBot = (_: unknown, seed: number): Bot => {
    const inner = createEasyBot(seed);
    return {
      chooseTrump: (v) => (views.push(v), inner.chooseTrump(v)),
      chooseCard: (v) => (views.push(v), inner.chooseCard(v)),
    };
  };
  const storage = {
    save: (s: SavedGame) => {
      saved = structuredClone(s);
      saves.push(saved);
    },
    load: () => (saved ? structuredClone(saved) : null),
    clear: () => {
      saved = null;
    },
  };
  const store = createGameStore({
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (h) => clearTimeout(h),
    getSettings: () => settings,
    newSeed: () => 42,
    createBot,
    storage,
    ...extra,
  });
  return { store, settings, saves, views, storage, getSaved: () => saved };
}

/** Runs timers until the human must act (or the game waits for a button). */
function runUntilWaiting(): void {
  for (let i = 0; i < 200; i++) {
    if (vi.getTimerCount() === 0) return;
    vi.runOnlyPendingTimers();
  }
  throw new Error('store never stopped for the human');
}

/** Plays a full game: the human always plays its first legal card (two taps). */
function playToEnd(store: ReturnType<typeof setup>['store']): void {
  for (let guard = 0; guard < 2000; guard++) {
    runUntilWaiting();
    const { game } = store.getState();
    if (!game) throw new Error('no game');
    if (game.phase === 'GAME_OVER') return;
    if (game.phase === 'ROUND_END') store.getState().nextRound();
    else if (game.phase === 'CHOOSE_TRUMP') store.getState().chooseTrump('S');
    else if (game.phase === 'PLAYING') {
      const card = getLegalCards(game.round.hands[HUMAN], game.round.currentTrick)[0]!;
      store.getState().tapCard(card.id);
      store.getState().tapCard(card.id);
    } else throw new Error(`stuck in ${game.phase}`);
  }
  throw new Error('game did not end');
}

describe('game store', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('deals only after the speed delay', () => {
    const { store } = setup({ speed: 'slow' });
    store.getState().newGame();
    expect(store.getState().game?.phase).toBe('DEAL_FIRST');
    vi.advanceTimersByTime(BOT_DELAY_MS.slow - 1);
    expect(store.getState().game?.phase).toBe('DEAL_FIRST');
    vi.advanceTimersByTime(1);
    expect(store.getState().game?.phase).not.toBe('DEAL_FIRST');
  });

  it('waits for the human trump choice and shows a toast for bot choices', () => {
    // Try seeds until seat 0 is the trump chooser (dealer = seat 3).
    for (let seed = 1; seed < 50; seed++) {
      const { store } = setup({}, { newSeed: () => seed });
      store.getState().newGame();
      runUntilWaiting();
      const game = store.getState().game!;
      if (game.round.trumpChooser === HUMAN) {
        expect(game.phase).toBe('CHOOSE_TRUMP');
        expect(game.round.hands[HUMAN]).toHaveLength(4);
        store.getState().chooseTrump('D');
        expect(store.getState().game?.round.trump).toBe('D');
        return;
      }
      expect(store.getState().toast?.kind).toBe('trumpChosen');
    }
    throw new Error('no seed made seat 0 the trump chooser');
  });

  it('plays a whole game to GAME_OVER and clears the save', () => {
    const { store, getSaved, saves } = setup({ speed: 'fast' });
    store.getState().newGame();
    playToEnd(store);
    const { game } = store.getState();
    expect(game?.phase).toBe('GAME_OVER');
    expect(Math.max(...game!.scores)).toBeGreaterThanOrEqual(10);
    expect(getSaved()).toBeNull();
    expect(store.getState().hasSave).toBe(false);
    expect(saves.length).toBeGreaterThan(30);
  });

  it('gives bots only their own PlayerView', () => {
    const { store, views } = setup({ speed: 'fast' });
    store.getState().newGame();
    playToEnd(store);
    expect(views.length).toBeGreaterThan(0);
    for (const v of views) {
      expect(v.seat).not.toBe(HUMAN);
      expect(Object.keys(v)).not.toContain('round');
      expect(v.hand.length).toBe(v.handCounts[v.seat]);
    }
  });

  it('holds a finished trick on the table, then collects it', () => {
    const { store, settings } = setup({ speed: 'normal' });
    store.getState().newGame();
    for (let guard = 0; guard < 100 && !store.getState().heldTrick; guard++) {
      runUntilWaiting();
      const { game } = store.getState();
      if (game?.phase === 'CHOOSE_TRUMP') store.getState().chooseTrump('S');
      else if (
        game?.phase === 'PLAYING' &&
        game.round.turn === HUMAN &&
        !store.getState().heldTrick
      ) {
        const card = getLegalCards(game.round.hands[HUMAN], game.round.currentTrick)[0]!;
        store.getState().tapCard(card.id);
        store.getState().tapCard(card.id);
      }
      // Stop timers mid-way once a trick is held.
      if (!store.getState().heldTrick && vi.getTimerCount() > 0) vi.runOnlyPendingTimers();
    }
    const held = store.getState().heldTrick!;
    expect(held.trick.plays).toHaveLength(4);
    expect(held.collecting).toBe(false);
    vi.advanceTimersByTime(TRICK_HOLD_MS[settings.speed]);
    expect(store.getState().heldTrick?.collecting).toBe(true);
    vi.advanceTimersByTime(COLLECT_MS);
    expect(store.getState().heldTrick).toBeNull();
  });

  describe('human card taps', () => {
    /** Advance until it's the human's turn with a non-empty trick where some card is illegal. */
    function reachFollowWithIllegal(oneTapPlay = false) {
      for (let seed = 1; seed < 200; seed++) {
        const ctx = setup({ oneTapPlay }, { newSeed: () => seed });
        const { store } = ctx;
        store.getState().newGame();
        for (let guard = 0; guard < 400; guard++) {
          runUntilWaiting();
          const { game } = store.getState();
          if (!game || game.phase === 'ROUND_END' || game.phase === 'GAME_OVER') break;
          if (game.phase === 'CHOOSE_TRUMP') {
            store.getState().chooseTrump('S');
            continue;
          }
          const hand = game.round.hands[HUMAN];
          const legal = getLegalCards(hand, game.round.currentTrick);
          if (legal.length < hand.length) return { ...ctx, game, hand, legal };
          store.getState().tapCard(legal[0]!.id);
          store.getState().tapCard(legal[0]!.id);
        }
      }
      throw new Error('never reached a follow-suit position');
    }

    it('shakes an illegal card, shows the follow-suit message and keeps the state', () => {
      const { store, game, hand, legal } = reachFollowWithIllegal();
      const illegal = hand.find((c) => !legal.includes(c))!;
      store.getState().tapCard(illegal.id);
      const s = store.getState();
      expect(s.game).toBe(game);
      expect(s.shake?.cardId).toBe(illegal.id);
      expect(s.toast).toMatchObject({
        kind: 'mustFollowSuit',
        suit: game.round.currentTrick.plays[0]!.card.suit,
      });
    });

    it('raises on the first tap and plays on the second tap or a trick-area tap', () => {
      const { store, legal } = reachFollowWithIllegal();
      const card = legal[0]!;
      store.getState().tapCard(card.id);
      expect(store.getState().raisedCardId).toBe(card.id);
      expect(store.getState().game?.round.hands[HUMAN]).toContainEqual(card);
      store.getState().tapTrickArea();
      expect(store.getState().game?.round.hands[HUMAN]).not.toContainEqual(card);
      expect(store.getState().raisedCardId).toBeNull();
    });

    it('plays on the first tap with oneTapPlay', () => {
      const { store, legal } = reachFollowWithIllegal(true);
      store.getState().tapCard(legal[0]!.id);
      expect(store.getState().game?.round.hands[HUMAN]).not.toContainEqual(legal[0]);
    });
  });

  it('auto-saves after each trick and Continue restores the game', () => {
    const first = setup({ speed: 'fast' });
    const { store } = first;
    store.getState().newGame();
    // Play until 3 tricks of round 1 are done.
    for (let guard = 0; guard < 100; guard++) {
      runUntilWaiting();
      const game = store.getState().game!;
      if (game.round.completedTricks.length >= 3) break;
      if (game.phase === 'CHOOSE_TRUMP') store.getState().chooseTrump('S');
      else {
        const card = getLegalCards(game.round.hands[HUMAN], game.round.currentTrick)[0]!;
        store.getState().tapCard(card.id);
        store.getState().tapCard(card.id);
      }
    }
    const tricksSaved = new Set(first.saves.map((s) => s.state.round.completedTricks.length));
    for (const n of [0, 1, 2, 3]) expect(tricksSaved.has(n), `saved after trick ${n}`).toBe(true);
    first.store.getState().exitToHome();
    expect(first.store.getState().game).toBeNull();
    expect(first.store.getState().hasSave).toBe(true);

    const savedState = first.getSaved()!.state;
    const second = setup({ speed: 'fast' }, { storage: first.storage });
    expect(second.store.getState().hasSave).toBe(true);
    expect(second.store.getState().continueGame()).toBe(true);
    expect(second.store.getState().game).toEqual(savedState);
    playToEnd(second.store);
    expect(second.store.getState().game?.phase).toBe('GAME_OVER');
  });

  it('continueGame returns false without a save', () => {
    const { store } = setup();
    expect(store.getState().continueGame()).toBe(false);
    expect(store.getState().game).toBeNull();
  });

  it('stops running timers after leaving the table', () => {
    const { store } = setup();
    store.getState().newGame();
    store.getState().exitToHome();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uses the difficulty setting by default, or the difficulty passed to newGame', () => {
    const levels: string[] = [];
    const createBot = (level: string, seed: number): Bot => {
      levels.push(level);
      return createEasyBot(seed);
    };
    const { store, getSaved } = setup({ botDifficulty: 'hard' }, { createBot });
    store.getState().newGame();
    expect(store.getState().difficulty).toBe('hard');
    expect(levels).toEqual(['hard', 'hard', 'hard']);
    expect(getSaved()?.difficulty).toBe('hard');

    levels.length = 0;
    store.getState().newGame({ difficulty: 'medium', seed: 9 });
    expect(store.getState().difficulty).toBe('medium');
    expect(store.getState().seed).toBe(9);
    expect(levels).toEqual(['medium', 'medium', 'medium']);
  });

  it('records a stats event for every round and one for the finished Real game', () => {
    const events: StatsEvent[] = [];
    const { store } = setup({}, { recordStats: (e) => events.push(e) });
    store.getState().newGame({ difficulty: 'hard' });
    playToEnd(store);
    const game = store.getState().game!;
    const rounds = events.filter((e) => e.type === 'round');
    expect(rounds).toHaveLength(game.roundHistory.length);
    expect(rounds.every((e) => e.type === 'round' && e.mode === 'real')).toBe(true);
    expect(events.filter((e) => e.type === 'gameOver')).toEqual([
      { type: 'gameOver', mode: 'real', difficulty: 'hard', won: game.scores[0] > game.scores[1] },
    ]);
    // Real games are not reviewed by the coach and have no hints.
    expect(events.some((e) => e.type === 'review' || e.type === 'hint')).toBe(false);
  });

  it('records hints and a review for every Practice move, even without auto feedback', () => {
    const events: StatsEvent[] = [];
    const { store } = setup(
      { practice: { highlightLegal: true, autoFeedback: false, allowUndo: true } },
      { recordStats: (e) => events.push(e) },
    );
    store.getState().newGame({ mode: 'practice' });
    for (let i = 0; i < 20; i++) {
      runUntilWaiting();
      const game = store.getState().game!;
      if (game.phase === 'PLAYING' && game.round.turn === HUMAN) break;
      if (game.phase === 'CHOOSE_TRUMP') store.getState().chooseTrump('S');
    }
    store.getState().requestHint();
    expect(events.filter((e) => e.type === 'hint')).toHaveLength(1);
    playToEnd(store);
    expect(events.filter((e) => e.type === 'review').length).toBeGreaterThan(0);
    expect(store.getState().coach).toBeNull();
    expect(events.filter((e) => e.type === 'gameOver')).toHaveLength(1);
  });

  it('clearSave forgets the saved game only when no game is open', () => {
    const { store, getSaved } = setup();
    store.getState().newGame();
    store.getState().clearSave();
    expect(getSaved()).not.toBeNull();
    store.getState().exitToHome();
    store.getState().clearSave();
    expect(getSaved()).toBeNull();
    expect(store.getState().hasSave).toBe(false);
  });
});
