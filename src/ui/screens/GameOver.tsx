// Game over screen (SPEC §7, §8.1): the winner, the final score and the round-by-round history.
import { useEffect, useRef } from 'react';
import type { GameState } from '../../engine/types';
import { useSettingsStore } from '../../store/settingsStore';
import { SUIT_SYMBOL, suitColorClass } from '../suits';
import { useT } from '../useT';
import { ScoreBar } from '../components/ScoreBar';

type Props = { game: GameState; onPlayAgain: () => void; onHome: () => void };

export function GameOver({ game, onPlayAgain, onHome }: Props) {
  const t = useT();
  const fourColor = useSettingsStore((s) => s.fourColorDeck);
  const heading = useRef<HTMLHeadingElement>(null);
  const won = game.scores[0] > game.scores[1];

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <main className={`game-over ${won ? 'game-over--won' : 'game-over--lost'}`}>
      <div className="game-over__panel">
        <h1 ref={heading} tabIndex={-1} className="game-over__headline">
          {won ? t('gameOver.won') : t('gameOver.lost')}
        </h1>
        <p className="game-over__sub">{won ? t('gameOver.wonSub') : t('gameOver.lostSub')}</p>

        <section className="game-over__section">
          <h2 className="game-over__h2">{t('gameOver.finalScore')}</h2>
          <p className="game-over__final">
            <span>{game.scores[0]}</span>
            <span className="game-over__dash">–</span>
            <span>{game.scores[1]}</span>
          </p>
          <ScoreBar scores={game.scores} target={game.settings.targetScore} />
        </section>

        <section className="game-over__section">
          <h2 className="game-over__h2">{t('gameOver.history')}</h2>
          <div className="game-over__table-wrap">
            <table className="game-over__table">
              <thead>
                <tr>
                  <th scope="col">{t('gameOver.colRound')}</th>
                  <th scope="col">{t('gameOver.colTrump')}</th>
                  <th scope="col">{t('gameOver.colTricks')}</th>
                  <th scope="col">{t('gameOver.colPoints')}</th>
                </tr>
              </thead>
              <tbody>
                {game.roundHistory.map((r) => (
                  <tr key={r.number}>
                    <td>{r.number}</td>
                    <td className={suitColorClass(r.trump, fourColor)}>{SUIT_SYMBOL[r.trump]}</td>
                    <td>
                      {r.tricksWon[0]} – {r.tricksWon[1]}
                    </td>
                    <td>
                      {r.winner === null
                        ? '0'
                        : `+${r.points} ${r.winner === 0 ? t('team.us') : t('team.them')}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="game-over__actions">
          <button type="button" className="btn btn--primary" onClick={onPlayAgain}>
            {t('gameOver.playAgain')}
          </button>
          <button type="button" className="btn" onClick={onHome}>
            {t('gameOver.home')}
          </button>
        </div>
      </div>
    </main>
  );
}
