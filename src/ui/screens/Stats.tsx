// Stats screen (SPEC §10.3). Real games: games played/won per difficulty, rounds won, කැපෝති for/against
// and trump-call success. Practice: games finished, hints used and the coach match rate.
import type { MessageKey } from '../../content/i18n/t';
import type { BotDifficulty } from '../../engine/types';
import { useNavStore } from '../../store/navStore';
import { isEmptyStats, percent } from '../../store/stats';
import { useStatsStore } from '../../store/statsStore';
import { BackIcon } from '../components/BackIcon';
import { LanguageToggle } from '../components/LanguageToggle';
import '../styles/game.css';
import '../styles/lesson.css';
import '../styles/settings.css';
import { useT, type TFunction } from '../useT';

const LEVELS: readonly { level: BotDifficulty; label: MessageKey }[] = [
  { level: 'easy', label: 'difficulty.easy' },
  { level: 'medium', label: 'difficulty.medium' },
  { level: 'hard', label: 'difficulty.hard' },
];

function formatPercent(t: TFunction, part: number, whole: number): string {
  const p = percent(part, whole);
  return p === null ? t('stats.none') : t('stats.percent', { n: p });
}

function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <figure className="stats__tile">
      <p className="stats__tile-value">{value}</p>
      <figcaption className="stats__tile-label">{label}</figcaption>
      {detail && <p className="stats__tile-detail">{detail}</p>}
    </figure>
  );
}

export function Stats() {
  const t = useT();
  const go = useNavStore((s) => s.go);
  const real = useStatsStore((s) => s.real);
  const practice = useStatsStore((s) => s.practice);
  const empty = isEmptyStats({ v: 1, real, practice });
  const total = LEVELS.reduce(
    (sum, { level }) => ({
      played: sum.played + real.byDifficulty[level].played,
      won: sum.won + real.byDifficulty[level].won,
    }),
    { played: 0, won: 0 },
  );

  return (
    <main className="stats">
      <header className="page-bar">
        <button
          type="button"
          className="icon-btn"
          aria-label={t('stats.back')}
          title={t('stats.back')}
          onClick={() => go({ name: 'home' })}
        >
          <BackIcon />
        </button>
        <h1 className="page-bar__title">{t('stats.title')}</h1>
        <LanguageToggle />
      </header>

      {empty ? (
        <p className="stats__empty">{t('stats.empty')}</p>
      ) : (
        <>
          <section className="stats__section" aria-labelledby="stats-real">
            <h2 id="stats-real" className="stats__heading">
              {t('stats.sectionReal')}
            </h2>
            <div className="stats__table-wrap">
              <table className="stats__table">
                <thead>
                  <tr>
                    <th scope="col">{t('stats.colLevel')}</th>
                    <th scope="col">{t('stats.colPlayed')}</th>
                    <th scope="col">{t('stats.colWon')}</th>
                    <th scope="col">{t('stats.colRate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {LEVELS.map(({ level, label }) => {
                    const { played, won } = real.byDifficulty[level];
                    return (
                      <tr key={level}>
                        <th scope="row">{t(label)}</th>
                        <td>{played}</td>
                        <td>{won}</td>
                        <td>{formatPercent(t, won, played)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">{t('stats.total')}</th>
                    <td>{total.played}</td>
                    <td>{total.won}</td>
                    <td>{formatPercent(t, total.won, total.played)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="stats__tiles">
              <Tile
                label={t('stats.roundsWon')}
                value={String(real.roundsWon)}
                detail={t('stats.roundsDetail', { total: real.roundsPlayed })}
              />
              <Tile
                label={t('stats.kapothi')}
                value={`${real.kapothiFor} – ${real.kapothiAgainst}`}
                detail={t('stats.kapothiDetail', {
                  for: real.kapothiFor,
                  against: real.kapothiAgainst,
                })}
              />
              <Tile
                label={t('stats.trumpCalls')}
                value={formatPercent(t, real.trumpCallsWon, real.trumpCalls)}
                detail={t('stats.trumpCallsDetail', {
                  won: real.trumpCallsWon,
                  calls: real.trumpCalls,
                })}
              />
            </div>
          </section>

          <section className="stats__section" aria-labelledby="stats-practice">
            <h2 id="stats-practice" className="stats__heading">
              {t('stats.sectionPractice')}
            </h2>
            <div className="stats__tiles">
              <Tile label={t('stats.practiceGames')} value={String(practice.gamesPlayed)} />
              <Tile label={t('stats.hintsUsed')} value={String(practice.hintsUsed)} />
              <Tile
                label={t('stats.matchRate')}
                value={formatPercent(t, practice.movesGood, practice.movesReviewed)}
                detail={t('stats.matchRateDetail', {
                  good: practice.movesGood,
                  total: practice.movesReviewed,
                })}
              />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
