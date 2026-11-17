// Lesson 1: කාඩ් හඳුනාගනිමු (SPEC §6.2). The 32 cards, the 4 suits and the rank order.
// Interactive part: 4 × "tap the highest card".
import type { Lesson } from './types';

export const lesson1 = {
  id: 'cards',
  order: 1,
  titleKey: 'lesson1.title',
  goalKey: 'lesson1.goal',
  steps: [
    { type: 'explain', textKey: 'lesson1.e1' },
    { type: 'explain', textKey: 'lesson1.e2' },
    { type: 'explain', textKey: 'lesson1.e3' },
    { type: 'explain', textKey: 'lesson1.e4' },
    {
      type: 'cardPick',
      promptKey: 'lesson1.k1',
      options: ['10H', 'KH', '7H', 'JH'],
      answer: 'KH',
      retryKey: 'lesson1.retry',
    },
    {
      type: 'cardPick',
      promptKey: 'lesson1.k2',
      options: ['9S', '10S', 'QS', '8S'],
      answer: 'QS',
      retryKey: 'lesson1.retry',
    },
    {
      type: 'cardPick',
      promptKey: 'lesson1.k3',
      options: ['JD', 'AD', 'KD', '10D'],
      answer: 'AD',
      retryKey: 'lesson1.retry',
    },
    {
      type: 'cardPick',
      promptKey: 'lesson1.k4',
      options: ['8C', '7C', '10C', '9C'],
      answer: '10C',
      retryKey: 'lesson1.retry',
    },
    { type: 'explain', textKey: 'lesson1.e5' },
    { type: 'quizBreak' },
  ],
  quiz: [
    {
      promptKey: 'lesson1.q1',
      options: [
        { labelKey: 'pick.KS', correct: false },
        { labelKey: 'pick.AS', correct: true },
        { labelKey: 'pick.10S', correct: false },
        { labelKey: 'pick.JS', correct: false },
      ],
      explainKey: 'lesson1.q1.x',
    },
    {
      promptKey: 'lesson1.q2',
      options: [
        { labelKey: 'lesson1.q2.a', correct: false },
        { labelKey: 'lesson1.q2.b', correct: true },
        { labelKey: 'lesson1.q2.c', correct: false },
      ],
      explainKey: 'lesson1.q2.x',
    },
    {
      promptKey: 'lesson1.q3',
      options: [
        { labelKey: 'pick.JD', correct: false },
        { labelKey: 'pick.KD', correct: true },
        { labelKey: 'pick.10D', correct: false },
        { labelKey: 'pick.7D', correct: false },
      ],
      explainKey: 'lesson1.q3.x',
    },
  ],
} satisfies Lesson;
