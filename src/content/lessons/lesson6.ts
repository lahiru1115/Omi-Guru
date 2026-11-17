// Lesson 6: ලකුණු (SPEC §6.2). 1 / 2 / 3 points, ties and the tie bonus, shown on a scoreboard.
// The point values in the text come from the house-rule settings ({trumpWin}, {defWin}, ...).
import type { Lesson } from './types';

export const lesson6 = {
  id: 'scoring',
  order: 6,
  titleKey: 'lesson6.title',
  goalKey: 'lesson6.goal',
  steps: [
    { type: 'explain', textKey: 'lesson6.e1' },
    {
      type: 'explain',
      textKey: 'lesson6.e2',
      scoreExample: { tricks: [6, 2], chooserTeam: 0 },
    },
    {
      type: 'explain',
      textKey: 'lesson6.e3',
      scoreExample: { tricks: [3, 5], chooserTeam: 0 },
    },
    {
      type: 'choice',
      promptKey: 'lesson6.c1',
      scoreExample: { tricks: [2, 6], chooserTeam: 1 },
      options: [
        { labelKey: 'pick.pts.trumpWin', correct: true },
        { labelKey: 'pick.pts.defWin', correct: false },
        { labelKey: 'pick.pts.kapothi', correct: false },
      ],
      retryKey: 'lesson6.r1',
    },
    {
      type: 'choice',
      promptKey: 'lesson6.c2',
      scoreExample: { tricks: [5, 3], chooserTeam: 1 },
      options: [
        { labelKey: 'pick.pts.trumpWin', correct: false },
        { labelKey: 'pick.pts.defWin', correct: true },
        { labelKey: 'pick.pts.kapothi', correct: false },
      ],
      retryKey: 'lesson6.r2',
    },
    {
      type: 'explain',
      textKey: 'lesson6.e4',
      scoreExample: { tricks: [8, 0], chooserTeam: 1 },
    },
    {
      type: 'explain',
      textKey: 'lesson6.e5',
      scoreExample: { tricks: [4, 4], chooserTeam: 0 },
    },
    {
      type: 'explain',
      textKey: 'lesson6.e6',
      scoreExample: { tricks: [5, 3], chooserTeam: 0, afterTie: true },
    },
    { type: 'explain', textKey: 'lesson6.e7' },
    { type: 'quizBreak' },
  ],
  quiz: [
    {
      promptKey: 'lesson6.q1',
      options: [
        { labelKey: 'pick.pts.trumpWin', correct: true },
        { labelKey: 'pick.pts.defWin', correct: false },
        { labelKey: 'pick.pts.kapothi', correct: false },
      ],
      explainKey: 'lesson6.q1.x',
    },
    {
      promptKey: 'lesson6.q2',
      options: [
        { labelKey: 'lesson6.q2.a', correct: true },
        { labelKey: 'lesson6.q2.b', correct: false },
        { labelKey: 'lesson6.q2.c', correct: false },
      ],
      explainKey: 'lesson6.q2.x',
    },
    {
      promptKey: 'lesson6.q3',
      options: [
        { labelKey: 'lesson6.q3.a', correct: false },
        { labelKey: 'lesson6.q3.b', correct: true },
        { labelKey: 'lesson6.q3.c', correct: false },
      ],
      explainKey: 'lesson6.q3.x',
    },
  ],
} satisfies Lesson;
