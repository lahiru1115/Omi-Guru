// Lesson 7: Partner එක්ක සෙල්ලම (SPEC §6.2). Don't beat your partner; lead to your partner's void.
// Trick 1: partner shows they have no ♦ by trumping. Trick 2: partner's ♣A is winning, so play low.
// Trick 3: an opponent is winning, so take it with ♥A. Trick 4: you lead ♦ and partner trumps.
import { botPlay } from './presets';
import type { Lesson } from './types';

export const lesson7 = {
  id: 'partner-play',
  order: 7,
  titleKey: 'lesson7.title',
  goalKey: 'lesson7.goal',
  preset: {
    dealer: 2, // seat 3 (left) leads
    trump: 'S',
    hands: [
      ['9D', '7D', 'KC', '8C', 'JH', 'AH', '10H', 'QS'],
      ['8D', '9C', '7H', '10D', 'AD', 'QC', '10C', '10S'],
      ['7S', 'AC', 'QH', '8S', 'KS', 'JS', '9H', '8H'],
      ['KD', '7C', 'KH', 'JD', 'QD', 'JC', 'AS', '9S'],
    ],
  },
  steps: [
    { type: 'explain', textKey: 'lesson7.e1' },
    botPlay(3, 'KD', 'lesson7.b1'),
    { type: 'play', seat: 0, accept: ['9D', '7D'], textKey: 'lesson7.p1' },
    botPlay(1, '8D'),
    botPlay(2, '7S', 'lesson7.b2'),
    { type: 'explain', textKey: 'lesson7.e2' },
    botPlay(2, 'AC', 'lesson7.b3'),
    botPlay(3, '7C'),
    {
      type: 'play',
      seat: 0,
      accept: ['8C'],
      textKey: 'lesson7.p2',
      retryKey: 'lesson7.r2',
    },
    botPlay(1, '9C'),
    { type: 'explain', textKey: 'lesson7.e3' },
    botPlay(2, 'QH', 'lesson7.b4'),
    botPlay(3, 'KH', 'lesson7.b5'),
    {
      type: 'play',
      seat: 0,
      accept: ['AH'],
      textKey: 'lesson7.p3',
      retryKey: 'lesson7.r3',
    },
    botPlay(1, '7H'),
    { type: 'explain', textKey: 'lesson7.e4' },
    {
      type: 'play',
      seat: 0,
      accept: ['9D', '7D'],
      textKey: 'lesson7.p4',
      retryKey: 'lesson7.r4',
    },
    botPlay(1, '10D'),
    botPlay(2, '8S'),
    botPlay(3, 'JD'),
    { type: 'explain', textKey: 'lesson7.e5' },
    { type: 'quizBreak' },
  ],
  quiz: [
    {
      promptKey: 'lesson7.q1',
      options: [
        { labelKey: 'pick.KC', correct: false },
        { labelKey: 'pick.8C', correct: true },
      ],
      explainKey: 'lesson7.q1.x',
    },
    {
      promptKey: 'lesson7.q2',
      options: [
        { labelKey: 'pick.suit.H', correct: true },
        { labelKey: 'pick.suit.C', correct: false },
        { labelKey: 'pick.suit.D', correct: false },
      ],
      explainKey: 'lesson7.q2.x',
    },
    {
      promptKey: 'lesson7.q3',
      options: [
        { labelKey: 'lesson7.q3.a', correct: true },
        { labelKey: 'lesson7.q3.b', correct: false },
        { labelKey: 'lesson7.q3.c', correct: false },
      ],
      explainKey: 'lesson7.q3.x',
    },
  ],
} satisfies Lesson;
