// Lesson 6's scoreboard (SPEC §6.2): tricks won by each team, who chose trumps, and the points the
// round gives, worked out by the engine's scoreRound with the current house-rule settings.
import type { CSSProperties } from 'react';
import type { MessageKey } from '../../content/i18n/t';
import type { ScoreExample as ScoreExampleData } from '../../content/lessons/types';
import { scoreRound } from '../../engine/scoring';
import type { GameSettings } from '../../engine/types';
import { useT } from '../useT';

const TEAM_KEYS: readonly MessageKey[] = ['team.us', 'team.them'];

type Props = { example: ScoreExampleData; settings: GameSettings };

export function ScoreExample({ example, settings }: Props) {
  const t = useT();
  const pending = example.afterTie ? settings.tieBonus : 0;
  const result = scoreRound(example.tricks, example.chooserTeam, pending, settings);

  let message: string;
  if (result.winner === null) message = t('round.tie');
  else if (result.reason === 'KAPOTHI') message = t('round.kapothi', { n: result.points });
  else if (result.reason === 'TRUMP_TEAM_WIN')
    message = t('round.trumpTeamWin', { n: result.points });
  else message = t('round.defenderWin', { n: result.points });

  return (
    <div className="score-example">
      {example.afterTie && <p className="score-example__note">{t('score.afterTie')}</p>}
      {example.tricks.map((tricks, team) => (
        <div
          key={team}
          className={`score-example__team ${result.winner === team ? 'score-example__team--won' : ''}`}
        >
          <span className="score-example__name">
            {t(TEAM_KEYS[team] as MessageKey)}
            {example.chooserTeam === team && (
              <span className="score-example__chose">{t('score.choseTrumps')}</span>
            )}
          </span>
          <span className="score-example__tricks" aria-label={`${t('score.tricks')}: ${tricks}`}>
            {Array.from({ length: 8 }, (_, i) => (
              <span
                key={i}
                className={`score-example__trick ${i < tricks ? 'score-example__trick--on' : ''}`}
                style={{ '--i': i } as CSSProperties}
              />
            ))}
          </span>
          <span className="score-example__count">{tricks}</span>
        </div>
      ))}
      <p className="score-example__result">
        {message}
        {result.winner !== null && result.bonusApplied > 0 && (
          <> {t('round.bonus', { bonus: result.bonusApplied })}</>
        )}
      </p>
    </div>
  );
}
