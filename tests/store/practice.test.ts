// Practice mode in the game store (SPEC §6.1): not saved, Medium bots at Slow speed, hints, coach
// feedback, bot explanations, undo, and illegal cards that can't be played.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Bot } from '../../src/ai/bot';
import { createBot } from '../../src/ai/botFactory';
import { getLegalCards } from '../../src/engine/rules';
import {
  DEFAULT_GAME_SETTINGS,
  type BotDifficulty,
  type GameSettings,
} from '../../src/engine/types';
import { createGameStore, HUMAN } from '../../src/store/gameStore';
import { BOT_DELAY_MS } from '../../src/store/pacing';
import type { SavedGame } from '../../src/store/savedGame';

function setup(overrides: Partial<GameSettings> = {}) {
  const saves: SavedGame[] = [];
  const difficulties: BotDifficulty[] = [];
  const settings: GameSettings = { ...DEFAULT_GAME_SETTINGS, ...overrides };
  const store = createGameStore({
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (h) => clearTimeout(h),
    getSettings: () => settings,
    newSeed: () => 7,
    createBot: (difficulty, seed): Bot => {
      difficulties.push(difficulty);
      return createBot(difficulty, seed);
    },
    storage: { save: (s) => saves.push(s), load: () => null, clear: () => undefined },
  });
  return { store, saves, difficulties, settings };
}

type Store = ReturnType<typeof setup>['store'];

function runTimers(): void {
  for (let i = 0; i < 300; i++) {
    if (vi.getTimerCount() === 0) return;
    vi.runOnlyPendingTimers();
  }
  throw new Error('timers never stopped');
}

/** Runs the game until it is the human's turn to play a card. */
function toHumanTurn(store: Store, accept: (s: Store) => boolean = () => true): void {
  for (let guard = 0; guard < 500; guard++) {
    runTimers();
    const { game } = store.getState();
    if (!game) throw new Error('no game');
    if (game.phase === 'CHOOSE_TRUMP') store.getState().chooseTrump('S');
    else if (game.phase === 'ROUND_END') store.getState().nextRound();
    else if (game.phase === 'PLAYING' && game.round.turn === HUMAN) {
      if (accept(store)) return;
      playFirstLegal(store);
    } else throw new Error(`stuck in ${game.phase}`);
  }
  throw new Error('never reached the human');
}

function playFirstLegal(store: Store): string {
  const { game } = store.getState();
  if (!game) throw new Error('no game');
  const card = getLegalCards(game.round.hands[HUMAN], game.round.currentTrick)[0]!;
  store.getState().tapCard(card.id);
  store.getState().tapCard(card.id);
  return card.id;
}

describe('practice mode', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is never saved and uses Medium bots', () => {
    const { store, saves, difficulties } = setup({ botDifficulty: 'hard' });
    store.getState().newGame({ mode: 'practice' });
    toHumanTurn(store);
    playFirstLegal(store);
    runTimers();
    store.getState().exitToHome();
    expect(saves).toHaveLength(0);
    expect(difficulties).toEqual(['medium', 'medium', 'medium']);
  });

  it('runs at Slow speed whatever the speed setting', () => {
    const { store } = setup({ speed: 'fast' });
    store.getState().newGame({ mode: 'practice' });
    vi.advanceTimersByTime(BOT_DELAY_MS.fast);
    expect(store.getState().game?.phase).toBe('DEAL_FIRST');
    vi.advanceTimersByTime(BOT_DELAY_MS.slow - BOT_DELAY_MS.fast);
    expect(store.getState().game?.phase).not.toBe('DEAL_FIRST');
  });

  it('a hint suggests a legal card with its reasons', () => {
    const { store } = setup();
    store.getState().newGame({ mode: 'practice' });
    toHumanTurn(store);
    store.getState().requestHint();
    const { hint, coach, game } = store.getState();
    expect(hint).not.toBeNull();
    const legal = getLegalCards(game!.round.hands[HUMAN], game!.round.currentTrick);
    expect(legal.map((c) => c.id)).toContain(hint!.cardId);
    expect(coach?.kind).toBe('hint');
    expect(coach?.lines.length).toBeGreaterThan(0);
  });

  it('each human play gets coach feedback, unless auto feedback is off', () => {
    const { store, settings } = setup();
    store.getState().newGame({ mode: 'practice' });
    toHumanTurn(store);
    playFirstLegal(store);
    expect(store.getState().coach?.kind).toBe('review');
    expect(store.getState().coach?.header?.key).toMatch(/^verdict\./);
    expect(store.getState().hint).toBeNull();

    settings.practice = { ...settings.practice, autoFeedback: false };
    store.getState().dismissCoach();
    toHumanTurn(store);
    playFirstLegal(store);
    expect(store.getState().coach).toBeNull();
  });

  it('records why each bot card was played and shows it on tap', () => {
    const { store } = setup();
    store.getState().newGame({ mode: 'practice' });
    toHumanTurn(store, (s) => {
      const g = s.getState().game!;
      return g.round.currentTrick.plays.length > 0 || g.round.completedTricks.length > 0;
    });
    const { game, botReasons } = store.getState();
    const botCards = [...game!.round.completedTricks, game!.round.currentTrick]
      .flatMap((t) => t.plays)
      .filter((p) => p.seat !== HUMAN)
      .map((p) => p.card.id);
    expect(botCards.length).toBeGreaterThan(0);
    for (const id of botCards) expect(botReasons[id]).toBeDefined();
    store.getState().showBotReason(botCards[0]!);
    expect(store.getState().coach?.kind).toBe('bot');
  });

  it('undo goes back to just before the human card, including the bot plays after it', () => {
    const { store } = setup();
    store.getState().newGame({ mode: 'practice' });
    toHumanTurn(store);
    const before = structuredClone(store.getState().game);
    playFirstLegal(store);
    toHumanTurn(store); // bots play on
    expect(store.getState().game).not.toEqual(before);
    expect(store.getState().undoStack).toHaveLength(1);

    store.getState().undo();
    expect(store.getState().game).toEqual(before);
    expect(store.getState().undoStack).toHaveLength(0);
    expect(store.getState().heldTrick).toBeNull();
  });

  it('the undo stack is cleared when a new round starts', () => {
    const { store } = setup({ targetScore: 50 });
    store.getState().newGame({ mode: 'practice' });
    toHumanTurn(store);
    playFirstLegal(store);
    expect(store.getState().undoStack.length).toBeGreaterThan(0);
    const round = store.getState().game!.round.number;
    toHumanTurn(store, (s) => s.getState().game!.round.number > round);
    expect(store.getState().undoStack).toHaveLength(0);
  });

  it('an illegal card does nothing (it is dimmed, no shake or toast)', () => {
    const { store } = setup();
    store.getState().newGame({ mode: 'practice' });
    toHumanTurn(store, (s) => {
      const g = s.getState().game!;
      const legal = getLegalCards(g.round.hands[HUMAN], g.round.currentTrick);
      return legal.length < g.round.hands[HUMAN].length;
    });
    const g = store.getState().game!;
    const legal = getLegalCards(g.round.hands[HUMAN], g.round.currentTrick).map((c) => c.id);
    const illegal = g.round.hands[HUMAN].find((c) => !legal.includes(c.id))!;
    store.getState().dismissToast(); // e.g. "X chose trumps"
    store.getState().tapCard(illegal.id);
    store.getState().tapCard(illegal.id);
    expect(store.getState().shake).toBeNull();
    expect(store.getState().toast).toBeNull();
    expect(store.getState().raisedCardId).toBeNull();
    expect(store.getState().game).toBe(g);
  });

  it('show all cards and the tracker toggle', () => {
    const { store } = setup();
    store.getState().newGame({ mode: 'practice' });
    store.getState().toggleShowAll();
    store.getState().toggleTracker();
    expect(store.getState().showAll).toBe(true);
    expect(store.getState().trackerOpen).toBe(true);
    store.getState().exitToHome();
    expect(store.getState().showAll).toBe(false);
  });

  it('a Real game has none of the aids', () => {
    const { store } = setup();
    store.getState().newGame();
    toHumanTurn(store);
    store.getState().requestHint();
    store.getState().toggleShowAll();
    expect(store.getState().hint).toBeNull();
    expect(store.getState().showAll).toBe(false);
    playFirstLegal(store);
    expect(store.getState().coach).toBeNull();
    expect(store.getState().undoStack).toHaveLength(0);
    expect(Object.keys(store.getState().botReasons)).toHaveLength(0);
  });
});
