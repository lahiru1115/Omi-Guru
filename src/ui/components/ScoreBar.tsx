// Team scores as tokens towards the target (SPEC §8.2): අපි ●●●○○ 3 | ඔවුන් ●○○○○ 1
import type { MessageKey } from '../../content/i18n/t';
import { useT } from '../useT';

type Props = { scores: readonly [number, number]; target: number };

const TEAM_KEYS: readonly MessageKey[] = ['team.us', 'team.them'];
const MAX_TOKENS = 15;

export function ScoreBar({ scores, target }: Props) {
  const t = useT();
  return (
    <div className="scorebar">
      {scores.map((score, team) => {
        const name = t(TEAM_KEYS[team] as MessageKey);
        return (
          <div
            key={team}
            className={`scorebar__team scorebar__team--${team === 0 ? 'us' : 'them'}`}
            aria-label={t('game.scoreLabel', { team: name, score, target })}
            role="img"
          >
            <span className="scorebar__name">{name}</span>
            {target <= MAX_TOKENS && (
              <span className="scorebar__tokens" aria-hidden="true">
                {Array.from({ length: target }, (_, i) => (
                  <span key={i} className={`token ${i < score ? 'token--on' : ''}`} />
                ))}
              </span>
            )}
            <span className="scorebar__score" aria-hidden="true">
              {score}
            </span>
          </div>
        );
      })}
    </div>
  );
}
