// Lesson list (SPEC §6.2, §8.1): the 8 lessons in order, ✓ on completed ones with the best quiz
// score, 🔒 on locked ones. Lessons unlock in order unless "unlock all lessons" is on.
import { LESSONS } from '../../content/lessons';
import { scoringParams } from '../../lessons/lessonRunner';
import { gameStore } from '../../store/gameStore';
import { useNavStore } from '../../store/navStore';
import { isLessonUnlocked, useProgressStore } from '../../store/progressStore';
import { getSettings, useSettingsStore } from '../../store/settingsStore';
import { BackIcon } from '../components/BackIcon';
import { LanguageToggle } from '../components/LanguageToggle';
import { LessonText } from '../components/LessonText';
import '../styles/lesson.css';
import { useT } from '../useT';

export function LessonList() {
  const t = useT();
  const go = useNavStore((s) => s.go);
  const lessons = useProgressStore((s) => s.lessons);
  const unlockAll = useSettingsStore((s) => s.unlockAllLessons);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  useSettingsStore((s) => s.language); // re-render on language change
  const params = scoringParams(getSettings());
  const progress = { v: 1 as const, lessons };

  return (
    <main className="lessons">
      <header className="page-bar">
        <button
          type="button"
          className="icon-btn"
          aria-label={t('lessons.back')}
          title={t('lessons.back')}
          onClick={() => go({ name: 'home' })}
        >
          <BackIcon />
        </button>
        <h1 className="page-bar__title">{t('lessons.title')}</h1>
        <LanguageToggle />
      </header>

      <ol className="lessons__list">
        {LESSONS.map((lesson, index) => {
          const unlocked = isLessonUnlocked(LESSONS, progress, index, unlockAll);
          const entry = lessons[lesson.id];
          const done = entry?.completed === true;
          return (
            <li key={lesson.id}>
              <button
                type="button"
                className={`lesson-card ${done ? 'lesson-card--done' : ''}`}
                disabled={!unlocked}
                onClick={() => go({ name: 'lesson', id: lesson.id })}
              >
                <span className="lesson-card__badge" aria-hidden="true">
                  {done ? '✓' : unlocked ? lesson.order : '🔒'}
                </span>
                <span className="lesson-card__body">
                  <span className="lesson-card__number">
                    {t('lessons.number', { n: lesson.order })}
                    {done && <span className="lesson-card__done"> · {t('lessons.completed')}</span>}
                  </span>
                  <span className="lesson-card__title">{t(lesson.titleKey)}</span>
                  <LessonText
                    as="span"
                    className="lesson-card__goal"
                    text={unlocked ? t(lesson.goalKey, params) : t('lessons.locked')}
                  />
                  {entry && (
                    <span className="lesson-card__best">
                      {t('lessons.best', { score: entry.bestScore, total: lesson.quiz.length })}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="lessons__footer">
        <label className="switch">
          <input
            type="checkbox"
            checked={unlockAll}
            onChange={(e) => updateSettings({ unlockAllLessons: e.target.checked })}
          />
          <span>{t('lessons.unlockAll')}</span>
        </label>
        <button
          type="button"
          className="btn"
          onClick={() => gameStore.getState().newGame({ mode: 'practice' })}
        >
          {t('lessons.practice')}
        </button>
      </div>
    </main>
  );
}
