// Creates the bot for a difficulty level (SPEC §4.3).
// M2 has only the Easy bot, so every level plays Easy until M3 adds Medium and Hard.
import type { BotDifficulty } from '../engine/types';
import type { Bot } from './bot';
import { createEasyBot } from './easyBot';

export function createBot(difficulty: BotDifficulty, seed: number): Bot {
  switch (difficulty) {
    case 'easy':
    case 'medium':
    case 'hard':
      return createEasyBot(seed);
  }
}
