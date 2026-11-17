// Lesson 4: හුරුව (SPEC §6.2). A trump beats any card of another suit.
// Trick 1: ♠ is led, the human has no ♠ and trumps (♥) to win. Trick 2: the human leads a trump
// and everyone must follow with trumps.
import { botPlay } from './presets';
import type { Lesson } from './types';

export const lesson4 = {
  id: 'trumps',
  order: 4,
  titleKey: 'lesson4.title',
  goalKey: 'lesson4.goal',
  preset: {
    dealer: 0, // seat 1 (right) leads
    trump: 'H',
    hands: [
      ['KH', '10H', '7H', 'AD', 'QD', '9C', '8C', '7C'],
      ['AS', 'QS', '9H', '8H', 'KD', 'JD', 'AC', 'KC'],
      ['7S', 'JS', '10S', 'JH', 'AH', '10D', '9D', 'QC'],
      ['KS', '9S', '8S', 'QH', '8D', '7D', 'JC', '10C'],
    ],
  },
  steps: [
    { type: 'explain', textKey: 'lesson4.e1', highlight: { area: 'trump' } },
    { type: 'explain', textKey: 'lesson4.e2' },
    { type: 'explain', textKey: 'lesson4.e3' },
    botPlay(1, 'AS', 'lesson4.b1'),
    botPlay(2, '7S'),
    botPlay(3, 'KS'),
    {
      type: 'play',
      seat: 0,
      accept: ['KH', '10H', '7H'],
      textKey: 'lesson4.p1',
      retryKey: 'lesson4.r1',
    },
    { type: 'explain', textKey: 'lesson4.e4' },
    {
      type: 'play',
      seat: 0,
      accept: ['KH', '10H', '7H'],
      textKey: 'lesson4.p2',
      retryKey: 'lesson4.r2',
    },
    botPlay(1, '8H'),
    botPlay(2, 'JH'),
    botPlay(3, 'QH'),
    { type: 'explain', textKey: 'lesson4.e5' },
    { type: 'quizBreak' },
  ],
  quiz: [
    {
      promptKey: 'lesson4.q1',
      options: [
        { labelKey: 'pick.AS', correct: false },
        { labelKey: 'pick.7H', correct: true },
        { labelKey: 'pick.KS', correct: false },
        { labelKey: 'pick.QS', correct: false },
      ],
      explainKey: 'lesson4.q1.x',
    },
    {
      promptKey: 'lesson4.q2',
      options: [
        { labelKey: 'pick.AC', correct: false },
        { labelKey: 'pick.9D', correct: false },
        { labelKey: 'pick.KC', correct: false },
        { labelKey: 'pick.JD', correct: true },
      ],
      explainKey: 'lesson4.q2.x',
    },
    {
      promptKey: 'lesson4.q3',
      options: [
        { labelKey: 'lesson4.q3.a', correct: true },
        { labelKey: 'lesson4.q3.b', correct: false },
      ],
      explainKey: 'lesson4.q3.x',
    },
  ],
} satisfies Lesson;
