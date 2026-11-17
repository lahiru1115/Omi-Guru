// Lesson data model (SPEC §6.2). Pure data: no React, DOM or storage.
//
// Additions to SPEC §6.2 (marked below):
// - `chooseTrump` and `play` steps may carry a `preset`, which deals a fresh table when the step
//   starts (lesson 5 needs three different 4-card hands).
// - `explain` may carry a `scoreExample` (lesson 6's scoreboard); `play`, `chooseTrump`, `cardPick`
//   and `choice` may carry a `retryKey`, the gentle message shown after a wrong answer.
// - A `choice` step: a multiple-choice question inside the lesson, retried until it is right
//   (lesson 6 has no cards to tap, so its exercises are score questions).
// - `textKey` is optional on bot plays (seats 1–3): the previous text stays on screen.
//
// Lesson text may contain card tokens like [AS] or [10H] (drawn as small cards), suit tokens like
// [S] (a suit pip), and the scoring placeholders {trumpWin} {defWin} {kapothi} {tieBonus} {target},
// filled from GameSettings (CLAUDE.md rule 6).
import type { CardId, RoundPreset, Seat, Suit, Team } from '../../engine/types';
import type { MessageKey } from '../i18n/t';

export type HighlightArea = 'hand' | 'trick' | 'trump' | 'score' | 'tracker';

/** Cards or table areas to highlight. `area: 'tracker'` also opens the card tracker. */
export type Highlight = { cards?: CardId[]; area?: HighlightArea };

/**
 * A scoreboard example: tricks won by [us, them] and which team chose trumps. `afterTie` adds the
 * tie bonus from the settings, as in the round after a 4–4 tie.
 */
export type ScoreExample = { tricks: [number, number]; chooserTeam: Team; afterTie?: boolean };

export type ExplainStep = {
  type: 'explain';
  textKey: MessageKey;
  highlight?: Highlight;
  scoreExample?: ScoreExample; // addition
};

export type ChooseTrumpStep = {
  type: 'chooseTrump';
  expected?: Suit;
  textKey: MessageKey;
  preset?: RoundPreset; // addition
  retryKey?: MessageKey; // addition
};

export type PlayStep = {
  type: 'play';
  seat: Seat;
  /** Seats 1–3: the scripted card. */
  cardId?: CardId;
  /** Seat 0: the allowed answers (any legal card when omitted). */
  accept?: CardId[];
  textKey?: MessageKey; // required for seat 0
  preset?: RoundPreset; // addition
  retryKey?: MessageKey; // addition
  highlight?: Highlight;
};

export type CardPickStep = {
  type: 'cardPick';
  promptKey: MessageKey;
  options: CardId[];
  answer: CardId;
  retryKey?: MessageKey; // addition
};

export type QuizOption = { labelKey: MessageKey; correct: boolean };

export type ChoiceStep = {
  type: 'choice'; // addition
  promptKey: MessageKey;
  options: QuizOption[];
  scoreExample?: ScoreExample;
  retryKey?: MessageKey;
};

export type QuizBreakStep = { type: 'quizBreak' };

export type LessonStep =
  ExplainStep | ChooseTrumpStep | PlayStep | CardPickStep | ChoiceStep | QuizBreakStep;

export type QuizQuestion = {
  promptKey: MessageKey;
  options: QuizOption[];
  explainKey: MessageKey;
};

export type Lesson = {
  id: string;
  order: number;
  titleKey: MessageKey;
  goalKey: MessageKey;
  /** Fixed hands, dealer and trump (all 32 cards, validated by a test). */
  preset?: RoundPreset;
  steps: LessonStep[];
  quiz: QuizQuestion[];
};
