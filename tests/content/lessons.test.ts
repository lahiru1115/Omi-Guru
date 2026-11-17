// SPEC §12 Content: every lesson preset has 32 unique cards with 8 per seat, every scripted play is
// legal, and every lesson text exists in both languages. The walk below plays every lesson through
// the real lesson runner and game engine, branching over every card a step accepts.
import { describe, expect, it } from 'vitest';
import { getTrumpHint } from '../../src/coach/hintEngine';
import en from '../../src/content/i18n/en.json';
import si from '../../src/content/i18n/si.json';
import type { MessageKey } from '../../src/content/i18n/t';
import { LESSONS } from '../../src/content/lessons';
import type { Lesson, LessonStep } from '../../src/content/lessons/types';
import { RANKS, SUITS } from '../../src/engine/cards';
import { getLegalCards, getTrickWinner } from '../../src/engine/rules';
import type { CardId, RoundPreset } from '../../src/engine/types';
import { getPlayerView } from '../../src/engine/view';
import * as runner from '../../src/lessons/lessonRunner';
import { tokensOf } from '../../src/ui/lessonTokens';
import { settings } from '../engine/helpers';

const SCORING_PLACEHOLDERS = new Set(['trumpWin', 'defWin', 'kapothi', 'tieBonus', 'target']);
const INTERACTIVE: readonly LessonStep['type'][] = ['chooseTrump', 'play', 'cardPick', 'choice'];

function presetsOf(lesson: Lesson): RoundPreset[] {
  const presets: RoundPreset[] = lesson.preset ? [lesson.preset] : [];
  for (const step of lesson.steps) {
    if ((step.type === 'chooseTrump' || step.type === 'play') && step.preset) {
      presets.push(step.preset);
    }
  }
  return presets;
}

function keysOf(lesson: Lesson): MessageKey[] {
  const keys: MessageKey[] = [lesson.titleKey, lesson.goalKey];
  for (const step of lesson.steps) {
    switch (step.type) {
      case 'explain':
        keys.push(step.textKey);
        break;
      case 'chooseTrump':
        keys.push(step.textKey);
        if (step.retryKey) keys.push(step.retryKey);
        break;
      case 'play':
        if (step.textKey) keys.push(step.textKey);
        if (step.retryKey) keys.push(step.retryKey);
        break;
      case 'cardPick':
        keys.push(step.promptKey);
        if (step.retryKey) keys.push(step.retryKey);
        break;
      case 'choice':
        keys.push(step.promptKey, ...step.options.map((o) => o.labelKey));
        if (step.retryKey) keys.push(step.retryKey);
        break;
      case 'quizBreak':
        break;
    }
  }
  for (const q of lesson.quiz)
    keys.push(q.promptKey, q.explainKey, ...q.options.map((o) => o.labelKey));
  return keys;
}

/**
 * Plays a lesson from `run` to the quiz, checking each step against the engine. Returns how many
 * complete paths were walked (one per combination of accepted human cards).
 */
function walk(run: runner.LessonRun): number {
  const id = run.lesson.id;
  for (let guard = 0; guard < 200 && run.stage === 'steps'; guard++) {
    const step = runner.currentStep(run);
    if (!step) throw new Error(`${id}: no step at ${run.stepIndex}`);
    const where = `${id} step ${run.stepIndex} (${step.type})`;
    const before = run.stepIndex;

    switch (step.type) {
      case 'explain':
      case 'quizBreak':
        run = runner.next(run);
        break;

      case 'play': {
        const game = run.game;
        expect(game, `${where}: needs a table`).not.toBeNull();
        if (!game) return 0;
        expect(game.phase, where).toBe('PLAYING');
        expect(game.round.turn, `${where}: seat ${step.seat} is not on turn`).toBe(step.seat);
        const hand = game.round.hands[step.seat];
        const legal = getLegalCards(hand, game.round.currentTrick).map((c) => c.id);
        if (step.seat !== runner.HUMAN_SEAT) {
          expect(step.cardId, `${where}: bot step needs a card`).toBeDefined();
          expect(legal, `${where}: ${step.cardId} is not legal`).toContain(step.cardId);
          run = runner.autoPlay(run);
          break;
        }
        expect(step.textKey, `${where}: a human step needs text`).toBeDefined();
        // Every accepted card still in the hand must be legal (cards played on another branch
        // are simply gone).
        const inHand = (step.accept ?? legal).filter((c) => hand.some((h) => h.id === c));
        expect(inHand.length, `${where}: no accepted card in hand`).toBeGreaterThan(0);
        for (const card of inHand) expect(legal, `${where}: ${card} is illegal`).toContain(card);
        const accepted = runner.acceptedCards(run, step);
        expect(accepted).toEqual(inHand);
        let paths = 0;
        for (const card of accepted) {
          const after = runner.humanPlay(run, card);
          expect(after.stepIndex, `${where}: ${card} did not advance`).toBe(before + 1);
          paths += walk(after);
        }
        return paths;
      }

      case 'chooseTrump': {
        const game = run.game;
        expect(game, `${where}: needs a table`).not.toBeNull();
        if (!game) return 0;
        expect(game.phase, where).toBe('CHOOSE_TRUMP');
        expect(game.round.trumpChooser, `${where}: you must choose`).toBe(runner.HUMAN_SEAT);
        expect(game.round.hands[runner.HUMAN_SEAT]).toHaveLength(4);
        const hint = getTrumpHint(getPlayerView(game, runner.HUMAN_SEAT));
        if (step.expected) {
          expect(step.expected, `${where}: expected must match the coach`).toBe(hint.suit);
        }
        run = runner.chooseTrump(run, step.expected ?? hint.suit);
        expect(run.game?.phase, where).toBe('PLAYING');
        break;
      }

      case 'cardPick': {
        expect(new Set(step.options).size, `${where}: duplicate options`).toBe(step.options.length);
        expect(step.options, where).toContain(step.answer);
        // A "who wins?" question about the trick on the table must name the real winner.
        const last = run.lastTrick;
        const onTable = run.game && run.game.round.currentTrick.plays.length === 0 ? last : null;
        if (onTable && onTable.plays.length === 4) {
          const trickCards = onTable.plays.map((p) => p.card.id).sort();
          if ([...step.options].sort().join() === trickCards.join()) {
            const winner = getTrickWinner(onTable, run.game?.round.trump ?? null);
            const winning = onTable.plays.find((p) => p.seat === winner)?.card.id;
            expect(step.answer, `${where}: wrong winner`).toBe(winning);
          }
        }
        const wrong = step.options.find((o) => o !== step.answer);
        if (wrong) expect(runner.pickCard(run, wrong).stepIndex, where).toBe(before);
        run = runner.pickCard(run, step.answer);
        break;
      }

      case 'choice': {
        const correct = step.options.flatMap((o, i) => (o.correct ? [i] : []));
        expect(correct, `${where}: exactly one correct option`).toHaveLength(1);
        run = runner.chooseOption(run, correct[0] ?? 0);
        break;
      }
    }
    expect(run.stepIndex, `${where}: did not advance`).toBe(before + 1);
  }
  expect(run.stage, `${id}: steps never finished`).toBe('quiz');
  return 1;
}

describe('lessons (SPEC §6.2, §12 Content)', () => {
  it('has the 8 lessons in order with unique ids', () => {
    expect(LESSONS).toHaveLength(8);
    expect(LESSONS.map((l) => l.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(8);
  });

  for (const lesson of LESSONS) {
    describe(`lesson ${lesson.order} (${lesson.id})`, () => {
      it('every preset has 32 unique cards with 8 per seat', () => {
        const allCards = SUITS.flatMap((s) => RANKS.map((r) => `${r}${s}`)).sort();
        for (const preset of presetsOf(lesson)) {
          for (const hand of preset.hands) expect(hand).toHaveLength(8);
          expect([...preset.hands.flat()].sort()).toEqual(allCards);
        }
      });

      it('has explain steps, interactive steps and 3 quiz questions', () => {
        expect(lesson.steps.some((s) => s.type === 'explain')).toBe(true);
        expect(lesson.steps.some((s) => INTERACTIVE.includes(s.type))).toBe(true);
        expect(lesson.steps.at(-1)?.type).toBe('quizBreak');
        expect(lesson.quiz).toHaveLength(3);
        for (const q of lesson.quiz) {
          expect(q.options.length).toBeGreaterThanOrEqual(2);
          expect(q.options.filter((o) => o.correct)).toHaveLength(1);
        }
      });

      it('every scripted play is legal and the lesson can be completed', () => {
        const paths = walk(runner.startLesson(lesson, settings()));
        expect(paths).toBeGreaterThan(0);
      });

      it('every text exists in Sinhala and English', () => {
        for (const key of keysOf(lesson)) {
          expect(si[key]?.trim(), `si: ${key}`).toBeTruthy();
          expect(en[key]?.trim(), `en: ${key}`).toBeTruthy();
        }
      });

      it('only uses the scoring placeholders', () => {
        for (const key of keysOf(lesson)) {
          for (const [, name] of si[key].matchAll(/\{(\w+)\}/g)) {
            expect(SCORING_PLACEHOLDERS.has(name ?? ''), `${key}: {${name}}`).toBe(true);
          }
        }
      });
    });
  }

  it('card and suit tokens are the same in Sinhala and English', () => {
    for (const key of Object.keys(si) as MessageKey[]) {
      expect(tokensOf(en[key]).sort(), key).toEqual(tokensOf(si[key]).sort());
    }
  });

  it('quiz card labels name real cards', () => {
    for (const lesson of LESSONS) {
      for (const q of lesson.quiz) {
        for (const o of q.options) {
          for (const token of tokensOf(si[o.labelKey])) {
            const isCard = token.length > 1;
            if (isCard)
              expect(SUITS.flatMap((s) => RANKS.map((r) => `${r}${s}`))).toContain(token as CardId);
          }
        }
      }
    }
  });
});
