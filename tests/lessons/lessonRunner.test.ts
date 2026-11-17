import { describe, expect, it } from 'vitest';
import { lesson1 } from '../../src/content/lessons/lesson1';
import { lesson2 } from '../../src/content/lessons/lesson2';
import { lesson5 } from '../../src/content/lessons/lesson5';
import { lesson6 } from '../../src/content/lessons/lesson6';
import * as runner from '../../src/lessons/lessonRunner';
import { settings } from '../engine/helpers';

const start = (lesson: Parameters<typeof runner.startLesson>[0]) =>
  runner.startLesson(lesson, settings());

/** Presses Next until the current step is not an explain step. */
function skipExplains(run: runner.LessonRun): runner.LessonRun {
  let r = run;
  while (runner.currentStep(r)?.type === 'explain') r = runner.next(r);
  return r;
}

/** Runs bot steps until the human must act. */
function runBots(run: runner.LessonRun): runner.LessonRun {
  let r = run;
  while (runner.isAutoStep(r)) r = runner.autoPlay(r);
  return r;
}

describe('lesson runner', () => {
  it('starts at step 0 with the preset dealt', () => {
    const run = start(lesson2);
    expect(run.stage).toBe('steps');
    expect(run.stepIndex).toBe(0);
    expect(run.game?.phase).toBe('PLAYING');
    expect(run.game?.round.hands[0]).toHaveLength(8);
    expect(start(lesson1).game).toBeNull();
  });

  it('Next only moves on from explain steps', () => {
    const run = start(lesson1);
    const after = runner.next(run);
    expect(after.stepIndex).toBe(1);
    const pick = skipExplains(after);
    expect(runner.currentStep(pick)?.type).toBe('cardPick');
    expect(runner.next(pick)).toBe(pick);
  });

  it('a wrong card pick gives a gentle retry and does not advance', () => {
    const pick = skipExplains(start(lesson1));
    const wrong = runner.pickCard(pick, '10H');
    expect(wrong.stepIndex).toBe(pick.stepIndex);
    expect(wrong.feedback).toEqual({ kind: 'retry', key: 'lesson1.retry' });
    expect(wrong.wrongPicks).toEqual(['10H']);
    const right = runner.pickCard(wrong, 'KH');
    expect(right.stepIndex).toBe(pick.stepIndex + 1);
    expect(right.feedback?.kind).toBe('correct');
    expect(right.wrongPicks).toEqual([]);
  });

  it('bots play their scripted cards; an illegal human card asks to follow suit', () => {
    const human = runBots(skipExplains(start(lesson2)));
    const step = runner.currentStep(human);
    expect(step).toMatchObject({ type: 'play', seat: 0 });
    expect(human.game?.round.currentTrick.plays.map((p) => p.card.id)).toEqual(['KH', '7H', 'AH']);

    const illegal = runner.humanPlay(human, 'AS');
    expect(illegal.stepIndex).toBe(human.stepIndex);
    expect(illegal.feedback).toEqual({ kind: 'retry', key: 'lessonPlayer.mustFollow', suit: 'H' });

    const played = runner.humanPlay(human, '9H');
    expect(played.stepIndex).toBe(human.stepIndex + 1);
    // The finished trick stays on show until the next card is played.
    expect(played.game?.round.currentTrick.plays).toHaveLength(0);
    expect(runner.shownTrick(played)?.plays).toHaveLength(4);
    expect(played.lastTrick?.winner).toBe(3);
  });

  it('a wrong trump choice shows the hint; the right one deals the second block', () => {
    const choose = skipExplains(start(lesson5));
    expect(runner.currentStep(choose)?.type).toBe('chooseTrump');
    expect(choose.game?.phase).toBe('CHOOSE_TRUMP');

    const wrong = runner.chooseTrump(choose, 'C');
    expect(wrong.trumpMistake).toBe(true);
    expect(wrong.feedback).toEqual({ kind: 'retry', key: 'lesson5.r1' });
    expect(wrong.stepIndex).toBe(choose.stepIndex);

    const right = runner.chooseTrump(wrong, 'H');
    expect(right.stepIndex).toBe(choose.stepIndex + 1);
    expect(right.trumpMistake).toBe(false);
    expect(right.game?.round.trump).toBe('H');
    expect(right.game?.round.hands[0]).toHaveLength(8);
  });

  it('a step preset deals a fresh table', () => {
    let run = skipExplains(start(lesson5));
    run = runner.chooseTrump(run, 'H');
    run = skipExplains(run);
    expect(run.game?.phase).toBe('CHOOSE_TRUMP');
    expect(run.game?.round.hands[0].map((c) => c.id)).toEqual(['AC', '10H', 'KC', '9H']);
  });

  it('choice steps retry until the right option', () => {
    let run = start(lesson6);
    while (runner.currentStep(run)?.type !== 'choice') run = runner.next(run);
    const wrong = runner.chooseOption(run, 1);
    expect(wrong.stepIndex).toBe(run.stepIndex);
    expect(wrong.wrongChoices).toEqual([1]);
    expect(runner.chooseOption(wrong, 0).stepIndex).toBe(run.stepIndex + 1);
  });

  it('scores the quiz: the first answer counts and 2/3 passes', () => {
    let run = start(lesson1);
    run = { ...run, stage: 'quiz', stepIndex: lesson1.steps.length };
    expect(runner.currentQuestion(run)).toBe(lesson1.quiz[0]);
    expect(runner.nextQuestion(run)).toBe(run); // not answered yet

    run = runner.answer(run, 1); // correct (A♠)
    expect(runner.answer(run, 0).answers[0]).toBe(1); // can't change the answer
    run = runner.nextQuestion(run);
    run = runner.answer(run, 0); // wrong (52)
    run = runner.nextQuestion(run);
    run = runner.answer(run, 1); // correct (K♦)
    run = runner.nextQuestion(run);

    expect(run.stage).toBe('result');
    expect(runner.quizScore(run)).toBe(2);
    expect(runner.isPassed(2)).toBe(true);
    expect(runner.isPassed(1)).toBe(false);
  });

  it('gives the scoring numbers from the settings', () => {
    expect(runner.scoringParams(settings({ defenderWinPoints: 3, targetScore: 7 }))).toEqual({
      trumpWin: 1,
      defWin: 3,
      kapothi: 3,
      tieBonus: 1,
      target: 7,
    });
  });
});
