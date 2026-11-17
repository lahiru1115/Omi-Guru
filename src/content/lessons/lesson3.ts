// Lesson 3: අතක් දිනන හැටි (SPEC §6.2). Without trumps, the highest card of the suit led wins.
// Two scripted tricks; after each one the learner predicts the winner. Trumps are ♠, and nobody
// plays one.
import { botPlay } from './presets';
import type { Lesson } from './types';

export const lesson3 = {
  id: 'winning-tricks',
  order: 3,
  titleKey: 'lesson3.title',
  goalKey: 'lesson3.goal',
  preset: {
    dealer: 3, // you lead
    trump: 'S',
    hands: [
      ['10D', '8H', 'AS', '9S', '7S', 'KC', 'QC', '9C'],
      ['KD', '9H', 'AH', 'QH', 'QD', 'JD', 'KS', '8C'],
      ['AC', 'JH', 'KH', '10H', '7H', 'QS', 'JS', 'JC'],
      ['7D', 'AD', '9D', '8D', '10S', '8S', '10C', '7C'],
    ],
  },
  steps: [
    { type: 'explain', textKey: 'lesson3.e1' },
    { type: 'explain', textKey: 'lesson3.e2' },
    {
      type: 'play',
      seat: 0,
      accept: ['10D'],
      textKey: 'lesson3.p1',
      retryKey: 'lesson3.r1',
      highlight: { cards: ['10D'] },
    },
    botPlay(1, 'KD'),
    botPlay(2, 'AC', 'lesson3.b1'),
    botPlay(3, '7D'),
    {
      type: 'cardPick',
      promptKey: 'lesson3.k1',
      options: ['10D', 'KD', 'AC', '7D'],
      answer: 'KD',
      retryKey: 'lesson3.r2',
    },
    { type: 'explain', textKey: 'lesson3.e3' },
    botPlay(1, '9H', 'lesson3.b2'),
    botPlay(2, 'JH'),
    botPlay(3, 'AD', 'lesson3.b3'),
    { type: 'play', seat: 0, accept: ['8H'], textKey: 'lesson3.p2' },
    {
      type: 'cardPick',
      promptKey: 'lesson3.k1',
      options: ['9H', 'JH', 'AD', '8H'],
      answer: 'JH',
      retryKey: 'lesson3.r3',
    },
    { type: 'explain', textKey: 'lesson3.e4' },
    { type: 'quizBreak' },
  ],
  quiz: [
    {
      promptKey: 'lesson3.q1',
      options: [
        { labelKey: 'pick.9C', correct: false },
        { labelKey: 'pick.AH', correct: false },
        { labelKey: 'pick.QC', correct: true },
        { labelKey: 'pick.10C', correct: false },
      ],
      explainKey: 'lesson3.q1.x',
    },
    {
      promptKey: 'lesson3.q2',
      options: [
        { labelKey: 'lesson3.q2.a', correct: true },
        { labelKey: 'lesson3.q2.b', correct: false },
      ],
      explainKey: 'lesson3.q2.x',
    },
    {
      promptKey: 'lesson3.q3',
      options: [
        { labelKey: 'lesson3.q3.a', correct: true },
        { labelKey: 'lesson3.q3.b', correct: false },
        { labelKey: 'lesson3.q3.c', correct: false },
      ],
      explainKey: 'lesson3.q3.x',
    },
  ],
} satisfies Lesson;
