// Creates the bot for a difficulty level (SPEC §4.3).
import type { BotDifficulty } from '../engine/types';
import type { Bot } from './bot';
import { createEasyBot } from './easyBot';
import { createHardBot } from './hardBot';
import { createHeuristicBot } from './heuristicBot';

export function createBot(difficulty: BotDifficulty, seed: number): Bot {
  switch (difficulty) {
    case 'easy':
      return createEasyBot(seed);
    case 'medium':
      return createHeuristicBot('basic');
    case 'hard':
      return createHardBot(seed);
  }
}
