import { afterEach, describe, expect, it, vi } from 'vitest';
import { LESSONS } from '../../src/content/lessons';
import { STORAGE_KEYS } from '../../src/storage/persist';
import {
  emptyProgress,
  isLessonUnlocked,
  parseProgress,
  withQuizResult,
} from '../../src/store/progressStore';
import { createMemoryStorage } from './memoryStorage';

describe('lesson progress (SPEC §6.2, §10.2)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('a quiz score of 2/3 or better completes the lesson; the best score is kept', () => {
    let p = withQuizResult(emptyProgress(), 'cards', 1);
    expect(p.lessons.cards).toEqual({ completed: false, bestScore: 1 });
    p = withQuizResult(p, 'cards', 3);
    expect(p.lessons.cards).toEqual({ completed: true, bestScore: 3 });
    p = withQuizResult(p, 'cards', 0);
    expect(p.lessons.cards).toEqual({ completed: true, bestScore: 3 });
  });

  it('ignores corrupt or foreign data', () => {
    expect(parseProgress(undefined)).toEqual(emptyProgress());
    expect(parseProgress({ v: 2, lessons: {} })).toEqual(emptyProgress());
    expect(
      parseProgress({
        v: 1,
        lessons: {
          cards: { completed: true, bestScore: 2 },
          bad: { completed: 'yes', bestScore: 2 },
          worse: { completed: true, bestScore: -1 },
        },
      }),
    ).toEqual({ v: 1, lessons: { cards: { completed: true, bestScore: 2 } } });
  });

  it('lessons unlock in order, or all at once with the setting', () => {
    const none = emptyProgress();
    expect(isLessonUnlocked(LESSONS, none, 0, false)).toBe(true);
    expect(isLessonUnlocked(LESSONS, none, 1, false)).toBe(false);
    const first = withQuizResult(none, LESSONS[0]!.id, 2);
    expect(isLessonUnlocked(LESSONS, first, 1, false)).toBe(true);
    expect(isLessonUnlocked(LESSONS, first, 2, false)).toBe(false);
    expect(isLessonUnlocked(LESSONS, none, 7, true)).toBe(true);
  });

  it('saves to omi.progress.v1 and loads it again', async () => {
    const storage = createMemoryStorage();
    vi.stubGlobal('localStorage', storage);
    const { useProgressStore } = await import('../../src/store/progressStore');
    useProgressStore.getState().recordQuiz('cards', 2);
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.progress) ?? '{}')).toEqual({
      v: 1,
      lessons: { cards: { completed: true, bestScore: 2 } },
    });

    vi.resetModules();
    const reloaded = await import('../../src/store/progressStore');
    expect(reloaded.useProgressStore.getState().lessons.cards).toEqual({
      completed: true,
      bestScore: 2,
    });
  });
});
