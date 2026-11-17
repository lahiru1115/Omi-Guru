// The lesson engine (SPEC §6.2): pure transitions over a LessonRun. Every table position comes from
// the game engine (createRoundFromPreset + applyAction), so lessons use the same rules as the game.
// No React, DOM, timers or storage here: src/store/lessonStore.ts adds pacing and saving.
//
// Flow: steps (explain → Next, interactive steps wait for a right answer, bot plays run
// automatically) → quiz (3 questions) → result (passed at 2/3 or better).
import type { MessageKey } from '../content/i18n/t';
import type { Lesson, LessonStep, PlayStep, QuizQuestion } from '../content/lessons/types';
import { getLegalCards, ledSuit } from '../engine/rules';
import { applyAction, createGame, createRoundFromPreset } from '../engine/stateMachine';
import type { CardId, GameSettings, GameState, RoundPreset, Suit, Trick } from '../engine/types';

export const PASS_SCORE = 2;
export const HUMAN_SEAT = 0;

export type Feedback =
  { kind: 'retry'; key: MessageKey; suit?: Suit } | { kind: 'correct'; key: MessageKey } | null;

export type LessonStage = 'steps' | 'quiz' | 'result';

export type LessonRun = {
  lesson: Lesson;
  settings: GameSettings;
  stage: LessonStage;
  stepIndex: number;
  /** The lesson table, or null when no preset has been dealt yet. */
  game: GameState | null;
  /** The last finished trick, kept on show until the next card is played. */
  lastTrick: Trick | null;
  feedback: Feedback;
  /** Wrong cards tapped in the current cardPick step. */
  wrongPicks: CardId[];
  /** Wrong options chosen in the current choice step. */
  wrongChoices: number[];
  /** True after a wrong trump choice in the current step (the UI then shows the trump hint). */
  trumpMistake: boolean;
  quizIndex: number;
  /** The option chosen for each quiz question (null = not answered yet). */
  answers: (number | null)[];
};

const LESSON_SEED = 1;

const RETRY_GENERIC: MessageKey = 'lessonPlayer.tryAgain';
const RETRY_MUST_FOLLOW: MessageKey = 'lessonPlayer.mustFollow';
const CORRECT: MessageKey = 'lessonPlayer.correct';

function dealPreset(settings: GameSettings, preset: RoundPreset): GameState {
  return createRoundFromPreset(createGame(settings, LESSON_SEED), preset);
}

export function currentStep(run: LessonRun): LessonStep | undefined {
  return run.stage === 'steps' ? run.lesson.steps[run.stepIndex] : undefined;
}

export function currentQuestion(run: LessonRun): QuizQuestion | undefined {
  return run.stage === 'quiz' ? run.lesson.quiz[run.quizIndex] : undefined;
}

/** True when the current step plays a bot's scripted card automatically. */
export function isAutoStep(run: LessonRun): boolean {
  const step = currentStep(run);
  return step?.type === 'play' && step.seat !== HUMAN_SEAT;
}

/** Steps with a preset deal their own table when they start. */
function enterStep(run: LessonRun): LessonRun {
  const step = currentStep(run);
  if (!step) return run;
  if ((step.type === 'chooseTrump' || step.type === 'play') && step.preset) {
    return { ...run, game: dealPreset(run.settings, step.preset), lastTrick: null };
  }
  return run;
}

/** Moves to the next step, or to the quiz after the last step. Keeps any feedback on show. */
function advance(run: LessonRun): LessonRun {
  const base = { ...run, wrongPicks: [], wrongChoices: [], trumpMistake: false };
  const stepIndex = run.stepIndex + 1;
  if (stepIndex >= run.lesson.steps.length) {
    return { ...base, stage: run.lesson.quiz.length > 0 ? 'quiz' : 'result', stepIndex };
  }
  return enterStep({ ...base, stepIndex });
}

export function startLesson(lesson: Lesson, settings: GameSettings): LessonRun {
  const run: LessonRun = {
    lesson,
    settings,
    stage: lesson.steps.length > 0 ? 'steps' : 'quiz',
    stepIndex: 0,
    game: lesson.preset ? dealPreset(settings, lesson.preset) : null,
    lastTrick: null,
    feedback: null,
    wrongPicks: [],
    wrongChoices: [],
    trumpMistake: false,
    quizIndex: 0,
    answers: lesson.quiz.map(() => null),
  };
  return enterStep(run);
}

/** "Next" on an explain or quizBreak step. */
export function next(run: LessonRun): LessonRun {
  const step = currentStep(run);
  if (!step || (step.type !== 'explain' && step.type !== 'quizBreak')) return run;
  return advance({ ...run, feedback: null });
}

function requireGame(run: LessonRun): GameState {
  if (!run.game) throw new Error(`Lesson ${run.lesson.id}: step ${run.stepIndex} needs a table`);
  return run.game;
}

/** Plays a card through the engine, remembering a finished trick so it stays on show. */
function playCard(run: LessonRun, step: PlayStep, cardId: CardId): LessonRun {
  const game = requireGame(run);
  const next = applyAction(game, { type: 'PLAY_CARD', seat: step.seat, cardId });
  const finished = next.round.completedTricks.length > game.round.completedTricks.length;
  const lastTrick = finished
    ? (next.round.completedTricks[next.round.completedTricks.length - 1] ?? null)
    : run.lastTrick;
  return advance({ ...run, game: next, lastTrick });
}

/** Plays the scripted card of a bot step (seats 1–3). */
export function autoPlay(run: LessonRun): LessonRun {
  const step = currentStep(run);
  if (step?.type !== 'play' || step.seat === HUMAN_SEAT) return run;
  if (!step.cardId)
    throw new Error(`Lesson ${run.lesson.id}: bot step ${run.stepIndex} has no card`);
  return playCard(run, step, step.cardId);
}

/** The cards the human may answer with in a play step: the accepted ones that are legal. */
export function acceptedCards(run: LessonRun, step: PlayStep): CardId[] {
  const game = requireGame(run);
  const legal = getLegalCards(game.round.hands[HUMAN_SEAT], game.round.currentTrick).map(
    (c) => c.id,
  );
  return step.accept ? step.accept.filter((id) => legal.includes(id)) : legal;
}

/** The human taps a card in a play step. A wrong card gives a gentle retry message. */
export function humanPlay(run: LessonRun, cardId: CardId): LessonRun {
  const step = currentStep(run);
  if (step?.type !== 'play' || step.seat !== HUMAN_SEAT) return run;
  const game = requireGame(run);
  const hand = game.round.hands[HUMAN_SEAT];
  if (!hand.some((c) => c.id === cardId)) return run;
  const legal = getLegalCards(hand, game.round.currentTrick);
  if (!legal.some((c) => c.id === cardId)) {
    const suit = ledSuit(game.round.currentTrick);
    return {
      ...run,
      feedback: suit ? { kind: 'retry', key: RETRY_MUST_FOLLOW, suit } : retry(step),
    };
  }
  if (!acceptedCards(run, step).includes(cardId)) return { ...run, feedback: retry(step) };
  return playCard({ ...run, feedback: { kind: 'correct', key: CORRECT } }, step, cardId);
}

function retry(step: { retryKey?: MessageKey }): Feedback {
  return { kind: 'retry', key: step.retryKey ?? RETRY_GENERIC };
}

/** The human picks trumps in a chooseTrump step. */
export function chooseTrump(run: LessonRun, suit: Suit): LessonRun {
  const step = currentStep(run);
  if (step?.type !== 'chooseTrump') return run;
  const game = requireGame(run);
  if (step.expected !== undefined && suit !== step.expected) {
    return { ...run, feedback: retry(step), trumpMistake: true };
  }
  return advance({
    ...run,
    game: dealSecondAfterTrump(game, suit),
    feedback: { kind: 'correct', key: CORRECT },
  });
}

function dealSecondAfterTrump(game: GameState, suit: Suit): GameState {
  const chosen = applyAction(game, { type: 'CHOOSE_TRUMP', seat: game.round.trumpChooser, suit });
  return applyAction(chosen, { type: 'DEAL_SECOND' });
}

/** The human taps a card in a cardPick step. */
export function pickCard(run: LessonRun, cardId: CardId): LessonRun {
  const step = currentStep(run);
  if (step?.type !== 'cardPick' || !step.options.includes(cardId)) return run;
  if (cardId !== step.answer) {
    return {
      ...run,
      feedback: retry(step),
      wrongPicks: run.wrongPicks.includes(cardId) ? run.wrongPicks : [...run.wrongPicks, cardId],
    };
  }
  return advance({ ...run, feedback: { kind: 'correct', key: CORRECT } });
}

/** The human chooses an option in a choice step. */
export function chooseOption(run: LessonRun, optionIndex: number): LessonRun {
  const step = currentStep(run);
  if (step?.type !== 'choice') return run;
  const option = step.options[optionIndex];
  if (!option) return run;
  if (!option.correct) {
    return {
      ...run,
      feedback: retry(step),
      wrongChoices: run.wrongChoices.includes(optionIndex)
        ? run.wrongChoices
        : [...run.wrongChoices, optionIndex],
    };
  }
  return advance({ ...run, feedback: { kind: 'correct', key: CORRECT } });
}

/** Chooses an answer for the current quiz question (the first choice counts). */
export function answer(run: LessonRun, optionIndex: number): LessonRun {
  const question = currentQuestion(run);
  if (!question || run.answers[run.quizIndex] != null) return run;
  if (optionIndex < 0 || optionIndex >= question.options.length) return run;
  const answers = [...run.answers];
  answers[run.quizIndex] = optionIndex;
  return { ...run, answers };
}

/** After an answered question: the next question, or the result. */
export function nextQuestion(run: LessonRun): LessonRun {
  if (run.stage !== 'quiz' || run.answers[run.quizIndex] == null) return run;
  const quizIndex = run.quizIndex + 1;
  if (quizIndex >= run.lesson.quiz.length) return { ...run, stage: 'result', feedback: null };
  return { ...run, quizIndex };
}

export function isCorrectAnswer(question: QuizQuestion, optionIndex: number | null): boolean {
  return optionIndex != null && question.options[optionIndex]?.correct === true;
}

export function quizScore(run: LessonRun): number {
  return run.lesson.quiz.reduce(
    (score, question, i) => score + (isCorrectAnswer(question, run.answers[i] ?? null) ? 1 : 0),
    0,
  );
}

export function isPassed(score: number): boolean {
  return score >= PASS_SCORE;
}

/** The trick to draw on the lesson table: the one in progress, or the last finished one. */
export function shownTrick(run: LessonRun): Trick | null {
  if (!run.game) return null;
  const current = run.game.round.currentTrick;
  return current.plays.length > 0 ? current : run.lastTrick;
}

/** Scoring numbers for lesson and rules text, from the house-rule settings (CLAUDE.md rule 6). */
export function scoringParams(settings: GameSettings): Record<string, number> {
  return {
    trumpWin: settings.trumpTeamWinPoints,
    defWin: settings.defenderWinPoints,
    kapothi: settings.kapothiPoints,
    tieBonus: settings.tieBonus,
    target: settings.targetScore,
  };
}
