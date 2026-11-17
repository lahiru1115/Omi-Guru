// Lesson player (SPEC §6.2, §8.1): steps on a small table, then a 3-question quiz, then the result
// with "ඊළඟ පාඩම" (next lesson) and "පුහුණු වෙන්න" (practise now). Every lesson rule and table
// position comes from the pure lesson runner, which uses the game engine.
import { useEffect, useState } from 'react';
import type { MessageKey } from '../../content/i18n/t';
import { LESSONS } from '../../content/lessons';
import type { Highlight, LessonStep } from '../../content/lessons/types';
import { getTrumpHint } from '../../coach/hintEngine';
import { cardFromId } from '../../engine/cards';
import type { Seat as SeatNumber } from '../../engine/types';
import { getPlayerView } from '../../engine/view';
import {
  currentQuestion,
  currentStep,
  HUMAN_SEAT,
  isCorrectAnswer,
  isPassed,
  quizScore,
  scoringParams,
  shownTrick,
  type LessonRun,
} from '../../lessons/lessonRunner';
import { gameStore } from '../../store/gameStore';
import { useLessonStore } from '../../store/lessonStore';
import { useNavStore } from '../../store/navStore';
import { useSettingsStore } from '../../store/settingsStore';
import { BackIcon } from '../components/BackIcon';
import { Card } from '../components/Card';
import { CardTracker } from '../components/CardTracker';
import { Hand } from '../components/Hand';
import { HintButton } from '../components/HintButton';
import { LanguageToggle } from '../components/LanguageToggle';
import { LessonText } from '../components/LessonText';
import { ScoreExample } from '../components/ScoreExample';
import { Seat } from '../components/Seat';
import { TrickArea } from '../components/TrickArea';
import { TrumpBadge } from '../components/TrumpBadge';
import { TrumpDialog } from '../components/TrumpDialog';
import '../styles/game.css';
import '../styles/lesson.css';
import { SUIT_KEY } from '../suits';
import { useT } from '../useT';

const BOT_SEATS: readonly SeatNumber[] = [2, 3, 1]; // top, left, right in DOM order

type Props = { lessonId: string };

/** The text to show for a step. Bot plays without their own text keep the previous text. */
function stepTextKey(run: LessonRun): MessageKey | undefined {
  for (let i = run.stepIndex; i >= 0; i--) {
    const step = run.lesson.steps[i];
    if (!step) continue;
    if (step.type === 'explain' || step.type === 'chooseTrump') return step.textKey;
    if (step.type === 'play' && step.textKey) return step.textKey;
    if (step.type === 'cardPick' || step.type === 'choice') return step.promptKey;
    if (step.type === 'quizBreak') return undefined;
  }
  return undefined;
}

function highlightOf(step: LessonStep | undefined): Highlight | undefined {
  if (step?.type === 'explain' || step?.type === 'play') return step.highlight;
  return undefined;
}

export function LessonPlayer({ lessonId }: Props) {
  const t = useT();
  const go = useNavStore((s) => s.go);
  const run = useLessonStore((s) => s.run);
  const actions = useLessonStore.getState();
  useSettingsStore((s) => s.language); // re-render on language change

  useEffect(() => {
    if (!useLessonStore.getState().start(lessonId)) useNavStore.getState().go({ name: 'lessons' });
    return () => useLessonStore.getState().stop();
  }, [lessonId]);

  if (!run || run.lesson.id !== lessonId) return null;
  const lesson = run.lesson;
  const params = scoringParams(run.settings);
  const text = (key: MessageKey) => t(key, params);
  const index = LESSONS.findIndex((l) => l.id === lesson.id);
  const nextLesson = LESSONS[index + 1];

  const totalSteps = lesson.steps.length + lesson.quiz.length;
  const done =
    run.stage === 'steps'
      ? run.stepIndex
      : run.stage === 'quiz'
        ? lesson.steps.length + run.quizIndex
        : totalSteps;

  return (
    <main className="lesson">
      <header className="page-bar">
        <button
          type="button"
          className="icon-btn"
          aria-label={t('lessonPlayer.back')}
          title={t('lessonPlayer.back')}
          onClick={() => go({ name: 'lessons' })}
        >
          <BackIcon />
        </button>
        <div className="page-bar__title page-bar__title--stack">
          <span className="page-bar__eyebrow">
            {t('lessonPlayer.progress', { n: lesson.order, total: LESSONS.length })}
          </span>
          <span>{t(lesson.titleKey)}</span>
        </div>
        <LanguageToggle />
      </header>
      <div
        className="lesson__progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalSteps}
        aria-valuenow={done}
      >
        <span style={{ width: `${(done / totalSteps) * 100}%` }} />
      </div>

      {run.stage === 'steps' && <StepsView run={run} text={text} />}

      {run.stage === 'quiz' && <QuizView run={run} text={text} />}

      {run.stage === 'result' && (
        <ResultView
          score={quizScore(run)}
          total={lesson.quiz.length}
          onNext={nextLesson ? () => go({ name: 'lesson', id: nextLesson.id }) : undefined}
          onPractise={() => {
            // Leaving Practice comes back to the lesson list.
            go({ name: 'lessons' });
            gameStore.getState().newGame({ mode: 'practice' });
          }}
          onRetry={() => actions.start(lesson.id)}
          onList={() => go({ name: 'lessons' })}
        />
      )}
    </main>
  );
}

type ViewProps = { run: LessonRun; text: (key: MessageKey) => string };

function Feedback({ run, text }: ViewProps) {
  const t = useT();
  const fb = run.feedback;
  if (!fb) return null;
  const message =
    fb.kind === 'retry' && fb.suit ? t(fb.key, { suit: t(SUIT_KEY[fb.suit]) }) : text(fb.key);
  return (
    <div
      key={`${fb.kind}-${run.stepIndex}-${run.wrongPicks.length}-${run.wrongChoices.length}`}
      className={`lesson__feedback lesson__feedback--${fb.kind}`}
      role="status"
      aria-live="polite"
    >
      <LessonText as="span" text={message} />
    </div>
  );
}

function StepsView({ run, text }: ViewProps) {
  const t = useT();
  const actions = useLessonStore.getState();
  const [trackerOpen, setTrackerOpen] = useState(false);
  const step = currentStep(run);
  if (!step) return null;
  const textKey = stepTextKey(run);
  const highlight = highlightOf(step);
  const game = run.game;
  const humanToPlay = step.type === 'play' && step.seat === HUMAN_SEAT;
  const botPlaying = step.type === 'play' && step.seat !== HUMAN_SEAT;
  const showTracker =
    game !== null && game.round.trump !== null && (trackerOpen || highlight?.area === 'tracker');

  const table = game && (
    <LessonTable
      run={run}
      step={step}
      highlight={highlight}
      humanToPlay={humanToPlay}
      trackerOpen={showTracker}
      onToggleTracker={() => setTrackerOpen((open) => !open)}
      note={
        step.type === 'chooseTrump' && run.feedback?.kind === 'retry'
          ? text(run.feedback.key)
          : null
      }
    />
  );

  return (
    <div className={`lesson__body ${game ? 'lesson__body--table' : ''}`}>
      {table}
      <section className="lesson__panel" aria-live="polite">
        {step.type !== 'chooseTrump' && <Feedback run={run} text={text} />}
        {step.type === 'quizBreak' ? (
          <>
            <h2 className="lesson__heading">{t('lessonPlayer.quizBreakTitle')}</h2>
            <p className="lesson__text">{t('lessonPlayer.quizBreakText')}</p>
            <button type="button" className="btn btn--primary" onClick={actions.next}>
              {t('lessonPlayer.startQuiz')}
            </button>
          </>
        ) : (
          textKey && <LessonText className="lesson__text" text={text(textKey)} />
        )}

        {step.type === 'explain' && step.scoreExample && (
          <ScoreExample key={run.stepIndex} example={step.scoreExample} settings={run.settings} />
        )}

        {step.type === 'choice' && (
          <>
            {step.scoreExample && (
              <ScoreExample
                key={run.stepIndex}
                example={step.scoreExample}
                settings={run.settings}
              />
            )}
            <div className="lesson__options">
              {step.options.map((option, i) => (
                <button
                  key={i}
                  type="button"
                  className="option-btn"
                  disabled={run.wrongChoices.includes(i)}
                  onClick={() => actions.chooseOption(i)}
                >
                  <LessonText as="span" text={text(option.labelKey)} />
                </button>
              ))}
            </div>
          </>
        )}

        {step.type === 'cardPick' && (
          <div className="lesson__picks" role="group">
            {step.options.map((id) => (
              <button
                key={id}
                type="button"
                className={`pick-card ${run.wrongPicks.includes(id) ? 'pick-card--wrong' : ''}`}
                disabled={run.wrongPicks.includes(id)}
                onClick={() => actions.pickCard(id)}
              >
                <Card card={cardFromId(id)} />
              </button>
            ))}
          </div>
        )}

        {step.type === 'explain' && (
          <button type="button" className="btn btn--primary lesson__next" onClick={actions.next}>
            {t('lessonPlayer.next')}
          </button>
        )}

        {botPlaying && <p className="lesson__waiting">{t('lessonPlayer.waiting')}</p>}
      </section>
      {/* After the text, so on a phone the text and Next button stay near the cards. */}
      {showTracker && game && (
        <div className="lesson__tracker">
          <CardTracker
            view={getPlayerView(game, HUMAN_SEAT)}
            highlight={highlight?.cards}
            onClose={() => setTrackerOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

type TableProps = {
  run: LessonRun;
  step: LessonStep;
  highlight: Highlight | undefined;
  humanToPlay: boolean;
  trackerOpen: boolean;
  onToggleTracker: () => void;
  note: string | null;
};

function LessonTable({
  run,
  step,
  highlight,
  humanToPlay,
  trackerOpen,
  onToggleTracker,
  note,
}: TableProps) {
  const t = useT();
  const actions = useLessonStore.getState();
  const game = run.game;
  if (!game) return null;
  const { round } = game;
  const trick = shownTrick(run) ?? round.currentTrick;
  const showingFinished = round.currentTrick.plays.length === 0 && run.lastTrick !== null;
  // While the learner predicts the winner, don't give the answer away.
  const winner =
    showingFinished && step.type !== 'cardPick' ? (run.lastTrick?.winner ?? null) : null;
  const choosing = step.type === 'chooseTrump';
  const view = getPlayerView(game, HUMAN_SEAT);
  const glow = (area: NonNullable<Highlight['area']>) =>
    highlight?.area === area ? 'lesson__glow' : '';

  return (
    <div className="lesson__table">
      <div className={`lesson__trump ${glow('trump')}`}>
        <TrumpBadge
          trump={round.trump}
          tricksWon={round.tricksWon}
          tieBonus={0}
          roundNumber={round.number}
        />
        {round.trump !== null && (
          <HintButton
            icon="📋"
            label={t('practice.tracker')}
            onClick={onToggleTracker}
            pressed={trackerOpen}
          />
        )}
      </div>
      {choosing ? (
        // No cards on the table yet: the trump dialog takes the table's place.
        <TrumpDialog
          key={run.stepIndex}
          className="trump-dialog--inline"
          onChoose={actions.chooseTrump}
          hint={run.trumpMistake ? getTrumpHint(view) : null}
          note={note}
        />
      ) : (
        <section className="table__felt lesson__felt">
          {BOT_SEATS.map((seat) => (
            <Seat
              key={seat}
              seat={seat}
              cardCount={round.hands[seat].length}
              isDealer={round.dealer === seat}
              isActive={step.type === 'play' && step.seat === seat}
            />
          ))}
          <div className={`table__centre ${glow('trick')}`}>
            <TrickArea
              trick={trick}
              winner={winner}
              collectTo={null}
              canTap={false}
              onTap={() => undefined}
              highlightIds={highlight?.cards}
            />
          </div>
        </section>
      )}
      <div className={`lesson__hand ${glow('hand')} ${humanToPlay ? 'lesson__hand--turn' : ''}`}>
        <Hand
          cards={round.hands[HUMAN_SEAT]}
          trump={round.trump}
          canPlay={humanToPlay}
          raisedCardId={null}
          shake={null}
          onTap={actions.playCard}
          hintIds={highlight?.cards}
        />
      </div>
    </div>
  );
}

function QuizView({ run, text }: ViewProps) {
  const t = useT();
  const actions = useLessonStore.getState();
  const question = currentQuestion(run);
  if (!question) return null;
  const chosen = run.answers[run.quizIndex] ?? null;
  const answered = chosen !== null;
  const last = run.quizIndex === run.lesson.quiz.length - 1;

  return (
    <section className="lesson__panel lesson__quiz">
      <p className="lesson__eyebrow">
        {t('lessonPlayer.question', { n: run.quizIndex + 1, total: run.lesson.quiz.length })}
      </p>
      <LessonText className="lesson__text lesson__text--big" text={text(question.promptKey)} />
      <div className="lesson__options">
        {question.options.map((option, i) => {
          const state = !answered
            ? ''
            : option.correct
              ? 'option-btn--right'
              : i === chosen
                ? 'option-btn--wrong'
                : 'option-btn--faded';
          return (
            <button
              key={i}
              type="button"
              className={`option-btn ${state}`}
              disabled={answered}
              aria-pressed={i === chosen}
              onClick={() => actions.answer(i)}
            >
              <LessonText as="span" text={text(option.labelKey)} />
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="lesson__explain" role="status">
          <p className="lesson__verdict">
            {isCorrectAnswer(question, chosen) ? t('lessonPlayer.right') : t('lessonPlayer.wrong')}
          </p>
          <LessonText className="lesson__text" text={text(question.explainKey)} />
          <button type="button" className="btn btn--primary" onClick={actions.nextQuestion}>
            {last ? t('lessonPlayer.seeResult') : t('lessonPlayer.next')}
          </button>
        </div>
      )}
    </section>
  );
}

type ResultProps = {
  score: number;
  total: number;
  onNext?: () => void;
  onPractise: () => void;
  onRetry: () => void;
  onList: () => void;
};

function ResultView({ score, total, onNext, onPractise, onRetry, onList }: ResultProps) {
  const t = useT();
  const passed = isPassed(score);
  return (
    <section className={`lesson__panel lesson__result ${passed ? 'lesson__result--pass' : ''}`}>
      <p className="lesson__score">{t('lessonPlayer.score', { score, total })}</p>
      <p className="lesson__text lesson__text--big">
        {passed ? t('lessonPlayer.passed') : t('lessonPlayer.failed')}
      </p>
      {passed && !onNext && <p className="lesson__text">{t('lessonPlayer.allDone')}</p>}
      <div className="lesson__actions">
        {passed && onNext && (
          <button type="button" className="btn btn--primary" onClick={onNext}>
            {t('lessonPlayer.nextLesson')}
          </button>
        )}
        {!passed && (
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            {t('lessonPlayer.retry')}
          </button>
        )}
        <button type="button" className="btn" onClick={onPractise}>
          {t('lessonPlayer.practise')}
        </button>
        <button type="button" className="btn" onClick={onList}>
          {t('lessonPlayer.lessons')}
        </button>
      </div>
    </section>
  );
}
