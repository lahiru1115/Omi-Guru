// Game table (SPEC §8.2): scores and trump on top, the partner opposite, opponents left and right,
// the trick in the middle and your cards at the bottom. In wide landscape the info panel moves to a
// right-side column. All game changes go through the game store, which calls the engine.
import { useCallback, useState } from 'react';
import type { Seat as SeatNumber } from '../../engine/types';
import { gameStore, HUMAN, useGameStore, type GameToast } from '../../store/gameStore';
import { Hand } from '../components/Hand';
import { LanguageToggle } from '../components/LanguageToggle';
import { RoundResult } from '../components/RoundResult';
import { ScoreBar } from '../components/ScoreBar';
import { Seat } from '../components/Seat';
import { Toast } from '../components/Toast';
import { TrickArea } from '../components/TrickArea';
import { TrumpBadge } from '../components/TrumpBadge';
import { TrumpDialog } from '../components/TrumpDialog';
import '../styles/game.css';
import { SUIT_KEY } from '../suits';
import { useSeatName } from '../useSeatName';
import { useT } from '../useT';
import { GameOver } from './GameOver';

const BOT_SEATS: readonly SeatNumber[] = [2, 3, 1]; // top, left, right in DOM order

export function GameTable() {
  const t = useT();
  const seatName = useSeatName();
  const game = useGameStore((s) => s.game);
  const seed = useGameStore((s) => s.seed);
  const heldTrick = useGameStore((s) => s.heldTrick);
  const raisedCardId = useGameStore((s) => s.raisedCardId);
  const shake = useGameStore((s) => s.shake);
  const toast = useGameStore((s) => s.toast);
  const actions = gameStore.getState(); // the action functions never change
  // After the last round the result modal shows first; this remembers that it was dismissed.
  const [resultSeenForSeed, setResultSeenForSeed] = useState<number | null>(null);

  const toastText = useCallback(
    (toastData: GameToast): string =>
      toastData.kind === 'mustFollowSuit'
        ? t('game.mustFollowSuit', { suit: t(SUIT_KEY[toastData.suit]) })
        : t('game.trumpChosenBy', {
            name: seatName(toastData.seat),
            suit: t(SUIT_KEY[toastData.suit]),
          }),
    [t, seatName],
  );

  if (!game) return null;
  const { round, phase } = game;
  const settled = heldTrick === null; // no finished trick still on show

  if (phase === 'GAME_OVER' && settled && resultSeenForSeed === seed) {
    return (
      <GameOver game={game} onPlayAgain={() => actions.newGame()} onHome={actions.exitToHome} />
    );
  }

  const humanToPlay = phase === 'PLAYING' && settled && round.turn === HUMAN;
  const humanChoosesTrump = phase === 'CHOOSE_TRUMP' && round.trumpChooser === HUMAN;
  const lastResult = game.roundHistory[game.roundHistory.length - 1];
  const showResult = settled && (phase === 'ROUND_END' || phase === 'GAME_OVER') && lastResult;

  let status = '';
  if (phase === 'CHOOSE_TRUMP' && !humanChoosesTrump) {
    status = t('game.trumpChoosing', { name: seatName(round.trumpChooser) });
  } else if (humanToPlay) {
    status = raisedCardId ? t('game.tapAgain') : t('game.yourTurn');
  }

  const isActive = (seat: SeatNumber) =>
    settled &&
    ((phase === 'PLAYING' && round.turn === seat) ||
      (phase === 'CHOOSE_TRUMP' && round.trumpChooser === seat));

  const info = (
    <>
      <ScoreBar scores={game.scores} target={game.settings.targetScore} />
      <TrumpBadge
        trump={round.trump}
        tricksWon={round.tricksWon}
        tieBonus={game.pendingTieBonus}
        roundNumber={round.number}
      />
    </>
  );

  return (
    <main className="table">
      <header className="table__top">
        <div className="table__bar">
          <button
            type="button"
            className="icon-btn"
            aria-label={t('game.exit')}
            title={t('game.exit')}
            onClick={actions.exitToHome}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                d="M15 5 8 12l7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <LanguageToggle />
        </div>
        <div className="table__info">{info}</div>
      </header>

      <section className="table__felt">
        {BOT_SEATS.map((seat) => (
          <Seat
            key={seat}
            seat={seat}
            cardCount={round.hands[seat].length}
            isDealer={round.dealer === seat}
            isActive={isActive(seat)}
          />
        ))}
        <div className="table__centre">
          <TrickArea
            trick={heldTrick?.trick ?? round.currentTrick}
            winner={heldTrick?.trick.winner ?? null}
            collectTo={heldTrick?.collecting ? heldTrick.trick.winner : null}
            canTap={humanToPlay && raisedCardId !== null}
            onTap={actions.tapTrickArea}
          />
        </div>
        {humanChoosesTrump && <TrumpDialog onChoose={actions.chooseTrump} />}
      </section>

      <div className={`table__me ${isActive(HUMAN) ? 'table__me--active' : ''}`}>
        <span className="table__me-name">
          {seatName(HUMAN)}
          {round.dealer === HUMAN && (
            <span className="seat__dealer" title={t('game.dealer')} aria-label={t('game.dealer')}>
              {t('game.dealerChip')}
            </span>
          )}
        </span>
        <span className="table__status" aria-live="polite">
          {status}
        </span>
      </div>

      <div className="table__hand">
        {toast && (
          <Toast
            message={toastText(toast)}
            nonce={toast.nonce}
            tone={toast.kind === 'mustFollowSuit' ? 'warn' : 'info'}
            onDone={actions.dismissToast}
          />
        )}
        <Hand
          cards={round.hands[HUMAN]}
          trump={round.trump}
          canPlay={humanToPlay}
          raisedCardId={raisedCardId}
          shake={shake}
          onTap={actions.tapCard}
        />
      </div>

      {showResult && (
        <RoundResult
          key={lastResult.number}
          result={lastResult}
          target={game.settings.targetScore}
          isLastRound={phase === 'GAME_OVER'}
          onNext={phase === 'GAME_OVER' ? () => setResultSeenForSeed(seed) : actions.nextRound}
        />
      )}
    </main>
  );
}
