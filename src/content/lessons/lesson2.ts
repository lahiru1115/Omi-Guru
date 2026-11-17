// Lesson 2: පාට අනුගමනය (SPEC §6.2). The follow-suit rule.
// Trick 1: ♥ is led and the human must follow with a ♥. Trick 2: ♦ is led, the human has none and
// may play any card. Trumps are ♣, and nobody plays one (trumps come in lesson 4).
import { botPlay } from './presets';
import type { Lesson } from './types';

export const lesson2 = {
  id: 'follow-suit',
  order: 2,
  titleKey: 'lesson2.title',
  goalKey: 'lesson2.goal',
  preset: {
    dealer: 0, // seat 1 (right) leads
    trump: 'C',
    hands: [
      ['9H', '8H', 'AS', 'KS', '10S', '9S', '8S', '7S'],
      ['KH', 'QH', '7D', '9D', 'AC', '7C', 'QS', '8C'],
      ['7H', 'JH', 'AD', 'QD', 'KC', '9C', 'JS', '10C'],
      ['AH', '10H', 'KD', 'JD', '10D', '8D', 'QC', 'JC'],
    ],
  },
  steps: [
    { type: 'explain', textKey: 'lesson2.e1' },
    { type: 'explain', textKey: 'lesson2.e2', highlight: { area: 'trick' } },
    botPlay(1, 'KH', 'lesson2.b1'),
    botPlay(2, '7H'),
    botPlay(3, 'AH'),
    {
      type: 'play',
      seat: 0,
      accept: ['9H', '8H'],
      textKey: 'lesson2.p1',
      retryKey: 'lesson2.r1',
    },
    { type: 'explain', textKey: 'lesson2.e3' },
    botPlay(3, 'KD', 'lesson2.b2'),
    { type: 'play', seat: 0, textKey: 'lesson2.p2' },
    botPlay(1, '7D'),
    botPlay(2, 'AD'),
    { type: 'explain', textKey: 'lesson2.e4' },
    { type: 'quizBreak' },
  ],
  quiz: [
    {
      promptKey: 'lesson2.q1',
      options: [
        { labelKey: 'pick.9H', correct: true },
        { labelKey: 'pick.AS', correct: false },
        { labelKey: 'lesson2.q1.c', correct: false },
      ],
      explainKey: 'lesson2.q1.x',
    },
    {
      promptKey: 'lesson2.q2',
      options: [
        { labelKey: 'lesson2.q2.a', correct: true },
        { labelKey: 'lesson2.q2.b', correct: false },
        { labelKey: 'lesson2.q2.c', correct: false },
      ],
      explainKey: 'lesson2.q2.x',
    },
    {
      promptKey: 'lesson2.q3',
      options: [
        { labelKey: 'lesson2.q3.a', correct: false },
        { labelKey: 'lesson2.q3.b', correct: true },
      ],
      explainKey: 'lesson2.q3.x',
    },
  ],
} satisfies Lesson;
