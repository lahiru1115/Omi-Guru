// Round result modal (SPEC §8.6), with a small celebration for කැපෝති (SPEC §8.4).
import { useEffect, useRef } from 'react';
import type { MessageKey } from '../../content/i18n/t';
import type { RoundResult as RoundResultData, ScoreReason } from '../../engine/types';
import { SUIT_SYMBOL } from '../suits';
import { useT } from '../useT';
import { ScoreBar } from './ScoreBar';

type Props = {
  result: RoundResultData;
  target: number;
  /** Next round, or (after the last round) on to the game over screen. */
  onNext: () => void;
  isLastRound: boolean;
};

const REASON_KEY: Readonly<Record<ScoreReason, MessageKey>> = {
  TRUMP_TEAM_WIN: 'round.trumpTeamWin',
  DEFENDER_WIN: 'round.defenderWin',
  KAPOTHI: 'round.kapothi',
  TIE: 'round.tie',
};

const BURST = ['S', 'H', 'D', 'C', 'S', 'H', 'D', 'C', 'S', 'H', 'D', 'C'] as const;

export function RoundResult({ result, target, onNext, isLastRound }: Props) {
  const t = useT();
  const nextButton = useRef<HTMLButtonElement>(null);
  const kapothi = result.reason === 'KAPOTHI';
  const headline =
    result.winner === null
      ? t('round.tieHeadline')
      : result.winner === 0
        ? t('round.weWon')
        : t('round.theyWon');

  useEffect(() => {
    nextButton.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="modal-backdrop">
      <div
        className={`modal round-result ${result.winner === 0 ? 'round-result--win' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="round-result-title"
      >
        {kapothi && (
          <div className="kapothi-burst" aria-hidden="true">
            {BURST.map((suit, i) => (
              <span key={i} className={`kapothi-burst__pip kapothi-burst__pip--${i}`}>
                {SUIT_SYMBOL[suit]}
              </span>
            ))}
          </div>
        )}
        <p className="round-result__eyebrow">{t('round.title', { n: result.number })}</p>
        <h2 id="round-result-title" className="round-result__headline">
          {headline}
        </h2>
        <p className="round-result__message">
          {t(REASON_KEY[result.reason], { n: result.points })}
          {result.bonusApplied > 0 && <> {t('round.bonus', { bonus: result.bonusApplied })}</>}
        </p>
        <dl className="round-result__stats">
          <div>
            <dt>{t('round.tricksHeading')}</dt>
            <dd>
              {t('team.us')} {result.tricksWon[0]} – {result.tricksWon[1]} {t('team.them')}
            </dd>
          </div>
        </dl>
        <p className="round-result__subhead">{t('round.scoresHeading')}</p>
        <ScoreBar scores={result.scoresAfter} target={target} />
        <button ref={nextButton} type="button" className="btn btn--primary" onClick={onNext}>
          {isLastRound ? t('round.seeResult') : t('round.next')}
        </button>
      </div>
    </div>
  );
}
