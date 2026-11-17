// Shared bot-vs-bot game runner for the simulation tests (SPEC §12). Every bot sees only its
// PlayerView. The runner checks the invariants as it goes and throws on the first violation.
import type { Bot } from '../../src/ai/bot';
import { createBot } from '../../src/ai/botFactory';
import { getLegalCards } from '../../src/engine/rules';
import { applyAction, createGame } from '../../src/engine/stateMachine';
import {
  DEFAULT_GAME_SETTINGS,
  type BotDifficulty,
  type CardId,
  type GameSettings,
  type GameState,
  type Seat,
  type Team,
} from '../../src/engine/types';
import { getPlayerView } from '../../src/engine/view';

export type LineUp = [BotDifficulty, BotDifficulty, BotDifficulty, BotDifficulty];

export type GameStats = {
  winner: Team;
  scores: [number, number];
  rounds: number;
  /** Milliseconds per chooseCard call, only when `timeSeat` is given. */
  decisionTimes: number[];
};

export type RunOptions = {
  settings?: GameSettings;
  /** Records chooseCard timings for seats with this difficulty. */
  timeDifficulty?: BotDifficulty;
  maxRounds?: number;
};

function fail(seed: number, message: string): never {
  throw new Error(`seed ${seed}: ${message}`);
}

/** Line-up where `a` plays as team 0 (seats 0 and 2) and `b` as team 1. */
export function teams(a: BotDifficulty, b: BotDifficulty): LineUp {
  return [a, b, a, b];
}

export function runGame(seed: number, lineUp: LineUp, options: RunOptions = {}): GameStats {
  const settings = options.settings ?? DEFAULT_GAME_SETTINGS;
  const maxRounds = options.maxRounds ?? 200;
  const bots = lineUp.map((level, seat) =>
    createBot(level, (seed * 7919 + seat * 104729) >>> 0),
  ) as [Bot, Bot, Bot, Bot];
  const decisionTimes: number[] = [];

  let s: GameState = createGame(settings, seed);
  let rounds = 0;
  let pointsAwarded: [number, number] = [0, 0];
  let roundCards = new Set<CardId>();

  for (let guard = 0; guard < maxRounds * 50; guard++) {
    switch (s.phase) {
      case 'DEAL_FIRST':
        roundCards = new Set();
        s = applyAction(s, { type: 'START_ROUND' });
        break;
      case 'CHOOSE_TRUMP': {
        const seat = s.round.trumpChooser;
        const view = getPlayerView(s, seat);
        if (view.hand.length !== 4) fail(seed, 'trump chooser does not hold exactly 4 cards');
        s = applyAction(s, { type: 'CHOOSE_TRUMP', seat, suit: bots[seat].chooseTrump(view) });
        break;
      }
      case 'DEAL_SECOND':
        s = applyAction(s, { type: 'DEAL_SECOND' });
        break;
      case 'PLAYING': {
        const seat: Seat = s.round.turn;
        const view = getPlayerView(s, seat);
        const timed = options.timeDifficulty === lineUp[seat];
        const start = timed ? performance.now() : 0;
        const { cardId } = bots[seat].chooseCard(view);
        if (timed) decisionTimes.push(performance.now() - start);
        const legal = getLegalCards(s.round.hands[seat], s.round.currentTrick);
        if (!legal.some((c) => c.id === cardId)) fail(seed, `seat ${seat} chose illegal ${cardId}`);
        if (roundCards.has(cardId)) fail(seed, `${cardId} played twice in a round`);
        roundCards.add(cardId);
        s = applyAction(s, { type: 'PLAY_CARD', seat, cardId });
        break;
      }
      case 'ROUND_END':
      case 'GAME_OVER': {
        // Check the round that just finished (the engine has already scored it).
        const { round } = s;
        const result = s.roundHistory[s.roundHistory.length - 1];
        if (!result || result.number !== round.number) fail(seed, 'round result missing');
        if (round.completedTricks.length !== 8) fail(seed, 'a round did not have 8 tricks');
        if (round.tricksWon[0] + round.tricksWon[1] !== 8) fail(seed, 'tricks do not add up to 8');
        if (roundCards.size !== 32) fail(seed, `only ${roundCards.size} cards played in a round`);
        if (round.hands.some((h) => h.length !== 0)) fail(seed, 'cards left in hand at round end');
        if (result.winner !== null) {
          pointsAwarded = [...pointsAwarded];
          pointsAwarded[result.winner] += result.points;
        }
        if (s.scores[0] !== pointsAwarded[0] || s.scores[1] !== pointsAwarded[1]) {
          fail(seed, 'scores do not equal the sum of round points');
        }
        rounds++;
        if (s.phase === 'GAME_OVER') {
          const winner: Team = s.scores[0] >= settings.targetScore ? 0 : 1;
          if (s.scores[winner] < settings.targetScore) fail(seed, 'game over below target');
          if (s.scores[1 - winner] >= settings.targetScore) fail(seed, 'both teams at target');
          return { winner, scores: [...s.scores], rounds, decisionTimes };
        }
        s = applyAction(s, { type: 'NEXT_ROUND' });
        break;
      }
    }
  }
  return fail(seed, 'game did not end');
}

/**
 * Plays `games` games of `strong` vs `weak`, swapping which team (and so which seats) the strong
 * bots sit in on alternate games to cancel any seat bias. Returns the strong side's win rate.
 */
export function winRate(
  strong: BotDifficulty,
  weak: BotDifficulty,
  games: number,
  firstSeed = 1,
): { wins: number; games: number; rate: number } {
  let wins = 0;
  for (let i = 0; i < games; i++) {
    const seed = firstSeed + i;
    const strongTeam: Team = i % 2 === 0 ? 0 : 1;
    const lineUp = strongTeam === 0 ? teams(strong, weak) : teams(weak, strong);
    if (runGame(seed, lineUp).winner === strongTeam) wins++;
  }
  return { wins, games, rate: wins / games };
}

export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)] ?? 0;
}
