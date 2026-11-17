// Lesson 5: හුරුව තෝරන හැටි (SPEC §6.2). Choosing trumps from the first 4 cards.
// Three chooseTrump exercises, each with its own deal. The expected suit is the coach's trump hint
// (SPEC §4.2 / §5.5), which a content test checks.
import { fillPreset } from './presets';
import type { Lesson } from './types';

// Dealer 3, so you (seat 0) choose trumps. Only your first 4 cards matter here.
const DEALER = 3;

export const lesson5 = {
  id: 'choosing-trumps',
  order: 5,
  titleKey: 'lesson5.title',
  goalKey: 'lesson5.goal',
  steps: [
    { type: 'explain', textKey: 'lesson5.e1' },
    { type: 'explain', textKey: 'lesson5.e2' },
    {
      type: 'chooseTrump',
      expected: 'H',
      textKey: 'lesson5.t1',
      retryKey: 'lesson5.r1',
      preset: fillPreset(DEALER, [['KH', 'QH', '8H', '9C'], [], [], []]),
    },
    { type: 'explain', textKey: 'lesson5.e3' },
    {
      type: 'chooseTrump',
      expected: 'C',
      textKey: 'lesson5.t2',
      retryKey: 'lesson5.r2',
      preset: fillPreset(DEALER, [['AC', '10H', 'KC', '9H'], [], [], []]),
    },
    { type: 'explain', textKey: 'lesson5.e4' },
    {
      type: 'chooseTrump',
      expected: 'D',
      textKey: 'lesson5.t3',
      retryKey: 'lesson5.r3',
      preset: fillPreset(DEALER, [['10D', 'KS', '9D', '7D'], [], [], []]),
    },
    { type: 'explain', textKey: 'lesson5.e5' },
    { type: 'quizBreak' },
  ],
  quiz: [
    {
      promptKey: 'lesson5.q1',
      options: [
        { labelKey: 'pick.suit.S', correct: true },
        { labelKey: 'pick.suit.H', correct: false },
        { labelKey: 'pick.suit.D', correct: false },
      ],
      explainKey: 'lesson5.q1.x',
    },
    {
      promptKey: 'lesson5.q2',
      options: [
        { labelKey: 'lesson5.q2.a', correct: false },
        { labelKey: 'lesson5.q2.b', correct: true },
        { labelKey: 'lesson5.q2.c', correct: false },
      ],
      explainKey: 'lesson5.q2.x',
    },
    {
      promptKey: 'lesson5.q3',
      options: [
        { labelKey: 'lesson5.q3.a', correct: false },
        { labelKey: 'lesson5.q3.b', correct: true },
      ],
      explainKey: 'lesson5.q3.x',
    },
  ],
} satisfies Lesson;
