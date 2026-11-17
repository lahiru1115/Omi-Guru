// Zustand store for the game table. It holds the GameState, changes it only through the engine's
// applyAction, and runs the automatic steps (deals, bot turns, trick collection) on timers paced by
// the speed setting (SPEC §4.6). Bots only ever see getPlayerView(state, seat).
//
// Practice mode (SPEC §6.1) adds the coach aids: hints, feedback after each human play, bot
// explanations, undo, show all cards and the card tracker. Practice games are never saved, so they
// can't overwrite the Real game in the single save slot.
//
// Built by createGameStore(deps) so tests can inject fake timers, storage and settings;
// the app uses the default instance through useGameStore.
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { Bot, Decision } from '../ai/bot';
import { createBot as defaultCreateBot } from '../ai/botFactory';
import { botReasonLines, hintBubble, reviewBubble } from '../coach/feedback';
import { getHint } from '../coach/hintEngine';
import type { CoachMessage } from '../coach/reasons';
import { reviewMove } from '../coach/review';
import { getLegalCards, ledSuit } from '../engine/rules';
import { applyAction, createGame } from '../engine/stateMachine';
import type {
  Action,
  BotDifficulty,
  CardId,
  GameSettings,
  GameState,
  Seat,
  Speed,
  Suit,
  Trick,
} from '../engine/types';
import { getPlayerView } from '../engine/view';
import { BOT_DELAY_MS, COLLECT_MS, TRICK_HOLD_MS } from './pacing';
import { clearSavedGame, loadSavedGame, saveGame, type SavedGame } from './savedGame';
import { getSettings as defaultGetSettings } from './settingsStore';
import type { StatsEvent } from './stats';
import { recordStats } from './statsStore';

export const HUMAN: Seat = 0;

/** Real game (no help, saved) or Practice (coach aids, not saved). */
export type PlayMode = 'real' | 'practice';

/** Practice bots and speed (SPEC §6.1, §4.6). */
export const PRACTICE_DIFFICULTY: BotDifficulty = 'medium';
export const PRACTICE_SPEED: Speed = 'slow';

/** The coach bubble in Practice. Empty `lines` on a bot bubble means the bot gave no reason. */
export type CoachBubbleData = {
  kind: 'hint' | 'review' | 'bot';
  header?: CoachMessage;
  lines: CoachMessage[];
  nonce: number;
};

export type GameToast =
  | { kind: 'mustFollowSuit'; suit: Suit; nonce: number }
  | { kind: 'trumpChosen'; seat: Seat; suit: Suit; nonce: number };

/** A finished trick kept on screen (the engine has already cleared currentTrick). */
export type HeldTrick = { trick: Trick & { winner: Seat }; collecting: boolean };

export type GameStoreData = {
  game: GameState | null;
  mode: PlayMode;
  difficulty: BotDifficulty;
  seed: number;
  raisedCardId: CardId | null;
  shake: { cardId: CardId; nonce: number } | null;
  toast: GameToast | null;
  heldTrick: HeldTrick | null;
  hasSave: boolean;
  // Practice only (these stay empty in a Real game):
  hint: Decision | null;
  coach: CoachBubbleData | null;
  /** Why each bot card of this round was played, by card id. */
  botReasons: Partial<Record<CardId, CoachMessage[]>>;
  /** The states just before each human card of this round (newest last). */
  undoStack: GameState[];
  showAll: boolean;
  trackerOpen: boolean;
};

export type GameStoreActions = {
  /**
   * Starts a new game. A Real game replaces any saved game; its difficulty defaults to the
   * botDifficulty setting. Practice defaults to Medium and is never saved.
   */
  newGame: (options?: NewGameOptions) => void;
  /** Loads the saved game. Returns false if there is none. */
  continueGame: () => boolean;
  chooseTrump: (suit: Suit) => void;
  tapCard: (cardId: CardId) => void;
  tapTrickArea: () => void;
  nextRound: () => void;
  /** Forgets the saved Real game (Settings → reset all data). Does nothing while a game is open. */
  clearSave: () => void;
  /** Leaves the table. A Real game stays saved (unless it is over). */
  exitToHome: () => void;
  dismissToast: () => void;
  // Practice aids. Each one does nothing in a Real game.
  requestHint: () => void;
  undo: () => void;
  toggleShowAll: () => void;
  toggleTracker: () => void;
  showBotReason: (cardId: CardId) => void;
  dismissCoach: () => void;
};

export type NewGameOptions = { seed?: number; difficulty?: BotDifficulty; mode?: PlayMode };

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
  /** Receives stats events (SPEC §10.3). */
  recordStats: (event: StatsEvent) => void;
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
  recordStats,
};

/** Each bot seat gets its own seed derived from the game seed. */
function botSeed(seed: number, seat: Seat): number {
  return (seed + Math.imul(seat, 0x9e3779b1)) >>> 0;
}

const PRACTICE_RESET = {
  hint: null,
  coach: null,
  botReasons: {},
  undoStack: [],
  showAll: false,
  trackerOpen: false,
} satisfies Partial<GameStoreData>;

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

    function isPractice(): boolean {
      return get().mode === 'practice';
    }

    function speed(): Speed {
      return isPractice() ? PRACTICE_SPEED : deps.getSettings().speed;
    }

    function persist(game: GameState): void {
      if (isPractice()) return; // Practice games are never saved
      if (game.phase === 'GAME_OVER') {
        deps.storage.clear();
        set({ hasSave: false });
        return;
      }
      const { difficulty, seed } = get();
      deps.storage.save({ v: 1, mode: 'real', difficulty, seed, state: game });
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
      // Undo goes back at most to the start of the current round (SPEC §6.1).
      const newRound = action.type === 'START_ROUND' || action.type === 'NEXT_ROUND';
      set({
        game: next,
        raisedCardId: null,
        heldTrick,
        ...(newRound ? { undoStack: [], botReasons: {} } : {}),
      });
      persist(next);
      recordProgress(before, next);
      advance();
    }

    /** Sends stats events for a finished round and a finished game. */
    function recordProgress(before: GameState, next: GameState): void {
      const mode = get().mode;
      if (next.roundHistory.length > before.roundHistory.length) {
        const result = next.roundHistory[next.roundHistory.length - 1];
        if (result) deps.recordStats({ type: 'round', mode, result });
      }
      if (next.phase === 'GAME_OVER' && before.phase !== 'GAME_OVER') {
        const won = next.scores[0] > next.scores[1];
        deps.recordStats({ type: 'gameOver', mode, difficulty: get().difficulty, won });
      }
    }

    /** Schedules the next automatic step, or waits for the human. */
    function advance(): void {
      const { game, heldTrick } = get();
      if (!game) return;
      const pace = speed();
      const delay = BOT_DELAY_MS[pace];

      if (heldTrick) {
        if (!heldTrick.collecting) {
          schedule(TRICK_HOLD_MS[pace], () => {
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
            const view = getPlayerView(g, seat);
            const decision = botFor(seat).chooseCard(view);
            if (isPractice()) {
              set({
                botReasons: {
                  ...get().botReasons,
                  [decision.cardId]: botReasonLines(view, decision),
                },
              });
            }
            dispatch({ type: 'PLAY_CARD', seat, cardId: decision.cardId });
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
      const game = get().game;
      if (game && isPractice()) {
        const { practice } = deps.getSettings();
        const update: Partial<GameStoreData> = { hint: null, coach: null };
        // Every Practice move is reviewed for the coach match rate, even without auto feedback.
        const viewBefore = getPlayerView(game, HUMAN);
        const review = reviewMove(viewBefore, cardId);
        deps.recordStats({ type: 'review', verdict: review.verdict });
        if (practice.autoFeedback) {
          const content = reviewBubble(viewBefore, cardId, review);
          update.coach = { kind: 'review', ...content, nonce: ++nonce };
        }
        if (practice.allowUndo) update.undoStack = [...get().undoStack, game];
        set(update);
      }
      dispatch({ type: 'PLAY_CARD', seat: HUMAN, cardId });
    }

    function start(game: GameState, difficulty: BotDifficulty, seed: number, mode: PlayMode): void {
      cancelTimer();
      setupBots(difficulty, seed);
      set({
        game,
        mode,
        difficulty,
        seed,
        raisedCardId: null,
        shake: null,
        toast: null,
        heldTrick: null,
        ...PRACTICE_RESET,
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
      ...PRACTICE_RESET,

      newGame: (options = {}) => {
        const gameSeed = (options.seed ?? deps.newSeed()) >>> 0;
        const mode = options.mode ?? 'real';
        const difficulty =
          options.difficulty ??
          (mode === 'practice' ? PRACTICE_DIFFICULTY : deps.getSettings().botDifficulty);
        start(createGame(deps.getSettings(), gameSeed), difficulty, gameSeed, mode);
        persist(get().game as GameState);
        advance();
      },

      continueGame: () => {
        const saved = deps.storage.load();
        if (!saved) {
          set({ hasSave: false });
          return false;
        }
        start(saved.state, saved.difficulty, saved.seed, 'real');
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
          // Practice: illegal cards are dimmed and can't be played (SPEC §2.6).
          if (isPractice()) return;
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

      clearSave: () => {
        if (get().game) return;
        deps.storage.clear();
        set({ hasSave: false });
      },

      exitToHome: () => {
        cancelTimer();
        const { game } = get();
        if (game) persist(game);
        set({
          game: null,
          heldTrick: null,
          raisedCardId: null,
          shake: null,
          toast: null,
          ...PRACTICE_RESET,
        });
      },

      dismissToast: () => set({ toast: null }),

      requestHint: () => {
        const game = isHumanTurnToPlay();
        if (!game || !isPractice()) return;
        const view = getPlayerView(game, HUMAN);
        const hint = getHint(view);
        deps.recordStats({ type: 'hint' });
        set({ hint, coach: { kind: 'hint', ...hintBubble(view, hint), nonce: ++nonce } });
      },

      undo: () => {
        const { undoStack, game } = get();
        if (!isPractice() || !game || !deps.getSettings().practice.allowUndo) return;
        if (game.phase !== 'PLAYING' && game.phase !== 'ROUND_END') return;
        const previous = undoStack[undoStack.length - 1];
        if (!previous) return;
        cancelTimer();
        set({
          game: previous,
          undoStack: undoStack.slice(0, -1),
          heldTrick: null,
          raisedCardId: null,
          hint: null,
          coach: null,
        });
        advance();
      },

      toggleShowAll: () => {
        if (isPractice()) set({ showAll: !get().showAll });
      },

      toggleTracker: () => {
        if (isPractice()) set({ trackerOpen: !get().trackerOpen });
      },

      showBotReason: (cardId) => {
        if (!isPractice()) return;
        const lines = get().botReasons[cardId];
        if (!lines) return;
        set({ coach: { kind: 'bot', lines, nonce: ++nonce } });
      },

      dismissCoach: () => set({ coach: null }),
    };
  });
}

export const gameStore = createGameStore();

export function useGameStore<T>(selector: (state: GameStore) => T): T {
  return useStore(gameStore, selector);
}
