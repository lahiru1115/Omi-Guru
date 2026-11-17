// UI pacing for the game table. Bot delays come from SPEC §4.6.
import type { Speed } from '../engine/types';

/** Delay before each bot action (and each automatic deal step). */
export const BOT_DELAY_MS: Readonly<Record<Speed, number>> = {
  slow: 1200,
  normal: 700,
  fast: 350,
};

/** How long a finished trick stays on the table before it is collected. */
export const TRICK_HOLD_MS: Readonly<Record<Speed, number>> = {
  slow: 1600,
  normal: 1100,
  fast: 700,
};

/** Length of the "trick slides to the winner" animation (matches game.css). */
export const COLLECT_MS = 450;
