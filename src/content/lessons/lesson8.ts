// Lesson 8: කාඩ් මතක තියාගැනීම (SPEC §6.2). Masters, voids and counting trumps, with the card
// tracker. Trick 1: ♠A and ♠K fall, so your ♠Q becomes the master. Trick 2: the left opponent trumps
// a ♦ (a void). Trick 3: ♣A and ♣K fall, then you find the new ♣ master.
import { botPlay } from './presets';
import type { Lesson } from './types';

export const lesson8 = {
  id: 'remembering-cards',
  order: 8,
  titleKey: 'lesson8.title',
  goalKey: 'lesson8.goal',
  preset: {
    dealer: 0, // seat 1 (right) leads
    trump: 'H',
    hands: [
      ['QS', 'JS', '8S', '7D', '9C', 'KH', '10H', '9H'],
      ['AS', '9D', 'KC', 'AD', 'QD', 'JD', 'AH', '10C'],
      ['7S', 'KD', '8C', '10D', '8D', 'QH', 'JH', '7C'],
      ['KS', '8H', 'AC', '7H', 'QC', '10S', '9S', 'JC'],
    ],
  },
  steps: [
    { type: 'explain', textKey: 'lesson8.e1' },
    botPlay(1, 'AS', 'lesson8.b1'),
    botPlay(2, '7S'),
    botPlay(3, 'KS'),
    {
      type: 'play',
      seat: 0,
      accept: ['8S'],
      textKey: 'lesson8.p1',
      retryKey: 'lesson8.r1',
    },
    { type: 'explain', textKey: 'lesson8.e2', highlight: { area: 'tracker', cards: ['QS'] } },
    botPlay(1, '9D', 'lesson8.b2'),
    botPlay(2, 'KD'),
    botPlay(3, '8H', 'lesson8.b3'),
    { type: 'play', seat: 0, accept: ['7D'], textKey: 'lesson8.p2' },
    { type: 'explain', textKey: 'lesson8.e3', highlight: { area: 'tracker' } },
    { type: 'explain', textKey: 'lesson8.e4', highlight: { area: 'tracker' } },
    botPlay(3, 'AC', 'lesson8.b4'),
    { type: 'play', seat: 0, accept: ['9C'], textKey: 'lesson8.p3' },
    botPlay(1, 'KC'),
    botPlay(2, '8C'),
    {
      type: 'cardPick',
      promptKey: 'lesson8.k1',
      options: ['QC', 'JC', '10C', '7C'],
      answer: 'QC',
      retryKey: 'lesson8.r2',
    },
    { type: 'explain', textKey: 'lesson8.e5', highlight: { area: 'tracker', cards: ['QC'] } },
    { type: 'quizBreak' },
  ],
  quiz: [
    {
      promptKey: 'lesson8.q1',
      options: [
        { labelKey: 'pick.QS', correct: true },
        { labelKey: 'pick.JS', correct: false },
        { labelKey: 'lesson8.q1.c', correct: false },
      ],
      explainKey: 'lesson8.q1.x',
    },
    {
      promptKey: 'lesson8.q2',
      options: [
        { labelKey: 'lesson8.q2.a', correct: true },
        { labelKey: 'lesson8.q2.b', correct: false },
        { labelKey: 'lesson8.q2.c', correct: false },
      ],
      explainKey: 'lesson8.q2.x',
    },
    {
      promptKey: 'lesson8.q3',
      options: [
        { labelKey: 'lesson8.q3.a', correct: true },
        { labelKey: 'lesson8.q3.b', correct: false },
        { labelKey: 'lesson8.q3.c', correct: false },
      ],
      explainKey: 'lesson8.q3.x',
    },
  ],
} satisfies Lesson;
