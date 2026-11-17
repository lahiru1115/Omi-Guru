// The lesson player's store: holds the LessonRun, plays the bots' scripted cards on Slow pacing
// (SPEC §4.6: lessons default to Slow) and saves the quiz result to the progress store.
// All lesson logic lives in the pure src/lessons/lessonRunner.ts.
import { create } from 'zustand';
import { lessonById } from '../content/lessons';
import * as runner from '../lessons/lessonRunner';
import type { CardId, Suit } from '../engine/types';
import { BOT_DELAY_MS } from './pacing';
import { useProgressStore } from './progressStore';
import { getSettings } from './settingsStore';

export const LESSON_BOT_DELAY_MS = BOT_DELAY_MS.slow;

type LessonStore = {
  run: runner.LessonRun | null;
  start: (lessonId: string) => boolean;
  next: () => void;
  chooseTrump: (suit: Suit) => void;
  playCard: (cardId: CardId) => void;
  pickCard: (cardId: CardId) => void;
  chooseOption: (index: number) => void;
  answer: (index: number) => void;
  nextQuestion: () => void;
  stop: () => void;
};

let timer: ReturnType<typeof setTimeout> | null = null;

function cancelTimer(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

export const useLessonStore = create<LessonStore>()((set, get) => {
  /** Stores the new run, schedules a bot play if one is next, and saves a finished quiz. */
  function update(next: runner.LessonRun): void {
    const before = get().run;
    set({ run: next });
    cancelTimer();
    if (runner.isAutoStep(next)) {
      timer = setTimeout(() => {
        timer = null;
        const current = get().run;
        if (current) update(runner.autoPlay(current));
      }, LESSON_BOT_DELAY_MS);
    }
    if (next.stage === 'result' && before?.stage !== 'result') {
      useProgressStore.getState().recordQuiz(next.lesson.id, runner.quizScore(next));
    }
  }

  function apply(fn: (run: runner.LessonRun) => runner.LessonRun): void {
    const { run } = get();
    if (run) update(fn(run));
  }

  return {
    run: null,
    start: (lessonId) => {
      const lesson = lessonById(lessonId);
      if (!lesson) return false;
      update(runner.startLesson(lesson, getSettings()));
      return true;
    },
    next: () => apply(runner.next),
    chooseTrump: (suit) => apply((run) => runner.chooseTrump(run, suit)),
    playCard: (cardId) => apply((run) => runner.humanPlay(run, cardId)),
    pickCard: (cardId) => apply((run) => runner.pickCard(run, cardId)),
    chooseOption: (index) => apply((run) => runner.chooseOption(run, index)),
    answer: (index) => apply((run) => runner.answer(run, index)),
    nextQuestion: () => apply(runner.nextQuestion),
    stop: () => {
      cancelTimer();
      set({ run: null });
    },
  };
});
