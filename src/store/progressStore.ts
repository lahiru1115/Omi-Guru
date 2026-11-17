// Lesson progress (SPEC §6.2, §10.2), saved to omi.progress.v1: which lessons are completed and the
// best quiz score of each. A lesson is completed with a quiz score of 2/3 or better. Lessons unlock
// in order, unless the "unlock all lessons" setting is on.
import { create } from 'zustand';
import type { Lesson } from '../content/lessons/types';
import { isPassed } from '../lessons/lessonRunner';
import { loadJSON, saveJSON, STORAGE_KEYS } from '../storage/persist';
import { isRecord } from './mergeSettings';

export type LessonProgress = { completed: boolean; bestScore: number };
export type ProgressData = { v: 1; lessons: Record<string, LessonProgress> };

export function emptyProgress(): ProgressData {
  return { v: 1, lessons: {} };
}

/** Validates saved progress. Bad entries are dropped; anything unreadable gives empty progress. */
export function parseProgress(value: unknown): ProgressData {
  if (!isRecord(value) || value.v !== 1 || !isRecord(value.lessons)) return emptyProgress();
  const lessons: Record<string, LessonProgress> = {};
  for (const [id, entry] of Object.entries(value.lessons)) {
    if (
      isRecord(entry) &&
      typeof entry.completed === 'boolean' &&
      typeof entry.bestScore === 'number' &&
      Number.isFinite(entry.bestScore) &&
      entry.bestScore >= 0
    ) {
      lessons[id] = { completed: entry.completed, bestScore: entry.bestScore };
    }
  }
  return { v: 1, lessons };
}

/** Records a quiz result: keeps the best score, and a pass marks the lesson completed for good. */
export function withQuizResult(progress: ProgressData, id: string, score: number): ProgressData {
  const before = progress.lessons[id];
  return {
    v: 1,
    lessons: {
      ...progress.lessons,
      [id]: {
        completed: (before?.completed ?? false) || isPassed(score),
        bestScore: Math.max(before?.bestScore ?? 0, score),
      },
    },
  };
}

/** Lesson n is open when it is the first one, the one before it is completed, or all are unlocked. */
export function isLessonUnlocked(
  lessons: readonly Lesson[],
  progress: ProgressData,
  index: number,
  unlockAll: boolean,
): boolean {
  if (unlockAll || index <= 0) return true;
  const previous = lessons[index - 1];
  return previous !== undefined && progress.lessons[previous.id]?.completed === true;
}

type ProgressStore = ProgressData & {
  recordQuiz: (id: string, score: number) => void;
};

export const useProgressStore = create<ProgressStore>()((set, get) => ({
  ...parseProgress(loadJSON(STORAGE_KEYS.progress)),
  recordQuiz: (id, score) => {
    const next = withQuizResult({ v: 1, lessons: get().lessons }, id, score);
    set(next);
    saveJSON(STORAGE_KEYS.progress, next);
  },
}));
