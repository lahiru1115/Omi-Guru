// Zustand store for the game table. It holds the GameState, changes it only through the engine's
// applyAction, and runs the automatic steps (deals, bot turns, trick collection) on timers paced by
// the speed setting (SPEC §4.6). Bots only ever see getPlayerView(state, seat).
//
// Built by createGameStore(deps) so tests can inject fake timers, storage and settings;
// the app uses the default instance through useGameStore.
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { Bot } from '../ai/bot';
import { createBot as defaultCreateBot } from '../ai/botFactory';
import { getLegalCards, ledSuit } from '../engine/rules';
import { applyAction, createGame } from '../engine/stateMachine';
import type {
  Action,
  BotDifficulty,
  CardId,
  GameSettings,
  GameState,
  Seat,
  Suit,
  Trick,
} from '../engine/types';
import { getPlayerView } from '../engine/view';
import { BOT_DELAY_MS, COLLECT_MS, TRICK_HOLD_MS } from './pacing';
import {
  clearSavedGame,
  loadSavedGame,
  saveGame,
  type GameMode,
  type SavedGame,
} from './savedGame';
import { getSettings as defaultGetSettings } from './settingsStore';

export const HUMAN: Seat = 0;

export type GameToast =
  | { kind: 'mustFollowSuit'; suit: Suit; nonce: number }
  | { kind: 'trumpChosen'; seat: Seat; suit: Suit; nonce: number };

/** A finished trick kept on screen (the engine has already cleared currentTrick). */
export type HeldTrick = { trick: Trick & { winner: Seat }; collecting: boolean };

export type GameStoreData = {
  game: GameState | null;
  mode: GameMode;
  difficulty: BotDifficulty;
  seed: number;
  raisedCardId: CardId | null;
  shake: { cardId: CardId; nonce: number } | null;
  toast: GameToast | null;
  heldTrick: HeldTrick | null;
  hasSave: boolean;
};

export type GameStoreActions = {
  /** Starts a new Real game (replaces any saved game). */
  newGame: (seed?: number) => void;
  /** Loads the saved game. Returns false if there is none. */
  continueGame: () => boolean;
  chooseTrump: (suit: Suit) => void;
  tapCard: (cardId: CardId) => void;
  tapTrickArea: () => void;
  nextRound: () => void;
  /** Leaves the table. The game stays saved (unless it is over). */
  exitToHome: () => void;
  dismissToast: () => void;
};

export type GameStore = GameStoreData & GameStoreActions;

type TimerHandle = ReturnType<typeof setTimeout>;

export type GameStoreDeps = {
  setTimeout: (fn: () => void, ms: number) => TimerHandle;
  clearTimeout: (handle: TimerHandle) => void;
  createBot: (difficulty: BotDifficulty, seed: number) => Bot;
  getSettings: () => GameSettings;
  newSeed: () => number;
  storage: {
    save: (saved: SavedGame) => void;
    load: () => SavedGame | null;
    clear: () => void;
  };
};

function randomSeed(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] ?? Date.now() >>> 0;
}

export const defaultDeps: GameStoreDeps = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle),
  createBot: defaultCreateBot,
  getSettings: defaultGetSettings,
  newSeed: randomSeed,
  storage: { save: saveGame, load: loadSavedGame, clear: clearSavedGame },
};

/** Each bot seat gets its own seed derived from the game seed. */
function botSeed(seed: number, seat: Seat): number {
  return (seed + Math.imul(seat, 0x9e3779b1)) >>> 0;
}

export function createGameStore(overrides: Partial<GameStoreDeps> = {}): StoreApi<GameStore> {
  const deps: GameStoreDeps = { ...defaultDeps, ...overrides };
  let timer: TimerHandle | null = null;
  let nonce = 0;
  let bots: Partial<Record<Seat, Bot>> = {};

  return createStore<GameStore>()((set, get) => {
    function cancelTimer(): void {
      if (timer !== null) deps.clearTimeout(timer);
      timer = null;
    }

    function schedule(ms: number, fn: () => void): void {
      cancelTimer();
      timer = deps.setTimeout(() => {
        timer = null;
        fn();
      }, ms);
    }

    function setupBots(difficulty: BotDifficulty, seed: number): void {
      bots = {};
      for (const seat of [1, 2, 3] as const)
        bots[seat] = deps.createBot(difficulty, botSeed(seed, seat));
    }

    function botFor(seat: Seat): Bot {
      const bot = bots[seat];
      if (!bot) throw new Error(`No bot for seat ${seat}`);
      return bot;
    }

    function persist(game: GameState): void {
      if (game.phase === 'GAME_OVER') {
        deps.storage.clear();
        set({ hasSave: false });
        return;
      }
      const { mode, difficulty, seed } = get();
      deps.storage.save({ v: 1, mode, difficulty, seed, state: game });
      set({ hasSave: true });
    }

    /** The single place that changes the GameState. Saves after every action. */
    function dispatch(action: Action): void {
      const before = get().game;
      if (!before) return;
      const next = applyAction(before, action);
      let heldTrick = get().heldTrick;
      if (
        action.type === 'PLAY_CARD' &&
        next.round.completedTricks.length > before.round.completedTricks.length
      ) {
        const trick = next.round.completedTricks[next.round.completedTricks.length - 1];
        if (trick && trick.winner !== undefined) {
          heldTrick = { trick: { ...trick, winner: trick.winner }, collecting: false };
        }
      }
      set({ game: next, raisedCardId: null, heldTrick });
      persist(next);
      advance();
    }

    /** Schedules the next automatic step, or waits for the human. */
    function advance(): void {
      const { game, heldTrick } = get();
      if (!game) return;
      const speed = deps.getSettings().speed;
      const delay = BOT_DELAY_MS[speed];

      if (heldTrick) {
        if (!heldTrick.collecting) {
          schedule(TRICK_HOLD_MS[speed], () => {
            set({ heldTrick: { ...heldTrick, collecting: true } });
            advance();
          });
        } else {
          schedule(COLLECT_MS, () => {
            set({ heldTrick: null });
            advance();
          });
        }
        return;
      }

      const { round } = game;
      switch (game.phase) {
        case 'DEAL_FIRST':
          schedule(delay, () => dispatch({ type: 'START_ROUND' }));
          return;
        case 'DEAL_SECOND':
          schedule(delay, () => dispatch({ type: 'DEAL_SECOND' }));
          return;
        case 'CHOOSE_TRUMP': {
          const seat = round.trumpChooser;
          if (seat === HUMAN) return;
          schedule(delay, () => {
            const g = get().game;
            if (!g) return;
            const suit = botFor(seat).chooseTrump(getPlayerView(g, seat));
            set({ toast: { kind: 'trumpChosen', seat, suit, nonce: ++nonce } });
            dispatch({ type: 'CHOOSE_TRUMP', seat, suit });
          });
          return;
        }
        case 'PLAYING': {
          const seat = round.turn;
          if (seat === HUMAN) return;
          schedule(delay, () => {
            const g = get().game;
            if (!g) return;
            const { cardId } = botFor(seat).chooseCard(getPlayerView(g, seat));
            dispatch({ type: 'PLAY_CARD', seat, cardId });
          });
          return;
        }
        case 'ROUND_END':
        case 'GAME_OVER':
          return; // waiting for the round result modal / game over screen
      }
    }

    function isHumanTurnToPlay(): GameState | null {
      const { game, heldTrick } = get();
      if (!game || heldTrick || game.phase !== 'PLAYING' || game.round.turn !== HUMAN) return null;
      return game;
    }

    function playHumanCard(cardId: CardId): void {
      dispatch({ type: 'PLAY_CARD', seat: HUMAN, cardId });
    }

    function start(game: GameState, difficulty: BotDifficulty, seed: number): void {
      cancelTimer();
      setupBots(difficulty, seed);
      set({
        game,
        mode: 'real',
        difficulty,
        seed,
        raisedCardId: null,
        shake: null,
        toast: null,
        heldTrick: null,
      });
    }

    return {
      game: null,
      mode: 'real',
      difficulty: 'easy',
      seed: 0,
      raisedCardId: null,
      shake: null,
      toast: null,
      heldTrick: null,
      hasSave: deps.storage.load() !== null,

      newGame: (seed) => {
        const gameSeed = (seed ?? deps.newSeed()) >>> 0;
        // M2 has only Easy bots; M3 adds the difficulty picker before a Real game.
        const difficulty: BotDifficulty = 'easy';
        start(createGame(deps.getSettings(), gameSeed), difficulty, gameSeed);
        persist(get().game as GameState);
        advance();
      },

      continueGame: () => {
        const saved = deps.storage.load();
        if (!saved) {
          set({ hasSave: false });
          return false;
        }
        start(saved.state, saved.difficulty, saved.seed);
        set({ hasSave: true });
        advance();
        return true;
      },

      chooseTrump: (suit) => {
        const { game } = get();
        if (!game || game.phase !== 'CHOOSE_TRUMP' || game.round.trumpChooser !== HUMAN) return;
        dispatch({ type: 'CHOOSE_TRUMP', seat: HUMAN, suit });
      },

      tapCard: (cardId) => {
        const game = isHumanTurnToPlay();
        if (!game) return;
        const hand = game.round.hands[HUMAN];
        if (!hand.some((c) => c.id === cardId)) return;
        const legal = getLegalCards(hand, game.round.currentTrick);
        if (!legal.some((c) => c.id === cardId)) {
          // Real game (SPEC §2.6): no dimming, so explain why the card can't be played.
          const suit = ledSuit(game.round.currentTrick);
          set({
            raisedCardId: null,
            shake: { cardId, nonce: ++nonce },
            toast: suit ? { kind: 'mustFollowSuit', suit, nonce: ++nonce } : get().toast,
          });
          return;
        }
        if (deps.getSettings().oneTapPlay || get().raisedCardId === cardId) {
          playHumanCard(cardId);
        } else {
          set({ raisedCardId: cardId });
        }
      },

      tapTrickArea: () => {
        const { raisedCardId } = get();
        if (raisedCardId && isHumanTurnToPlay()) playHumanCard(raisedCardId);
      },

      nextRound: () => {
        const { game, heldTrick } = get();
        if (!game || heldTrick || game.phase !== 'ROUND_END') return;
        dispatch({ type: 'NEXT_ROUND' });
      },

      exitToHome: () => {
        cancelTimer();
        const { game } = get();
        if (game) persist(game);
        set({ game: null, heldTrick: null, raisedCardId: null, shake: null, toast: null });
      },

      dismissToast: () => set({ toast: null }),
    };
  });
}

export const gameStore = createGameStore();

export function useGameStore<T>(selector: (state: GameStore) => T): T {
  return useStore(gameStore, selector);
}
