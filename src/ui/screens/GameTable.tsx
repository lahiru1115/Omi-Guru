// Game table (SPEC §8.2): scores and trump on top, the partner opposite, opponents left and right,
// the trick in the middle and your cards at the bottom. In wide landscape the info panel (and in
// Practice the coach bubble and card tracker) move to a right-side column. All game changes go
// through the game store, which calls the engine.
//
// Practice (SPEC §6.1) adds: dimmed illegal cards, 💡 hint, coach feedback, card tracker, bot
// explanations (tap a bot's card), ↶ undo, 👁 show all cards and the trump hint in the trump dialog.
import { useCallback, useState } from 'react';
import { getTrumpHint } from '../../coach/hintEngine';
import { getLegalCards } from '../../engine/rules';
import type { CardId, Seat as SeatNumber } from '../../engine/types';
import { getPlayerView } from '../../engine/view';
import { gameStore, HUMAN, useGameStore, type GameToast } from '../../store/gameStore';
import { useSettingsStore } from '../../store/settingsStore';
import { CardTracker } from '../components/CardTracker';
import { CoachBubble } from '../components/CoachBubble';
import { Hand } from '../components/Hand';
import { HintButton } from '../components/HintButton';
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
  const mode = useGameStore((s) => s.mode);
  const seed = useGameStore((s) => s.seed);
  const heldTrick = useGameStore((s) => s.heldTrick);
  const raisedCardId = useGameStore((s) => s.raisedCardId);
  const shake = useGameStore((s) => s.shake);
  const toast = useGameStore((s) => s.toast);
  const hint = useGameStore((s) => s.hint);
  const coach = useGameStore((s) => s.coach);
  const botReasons = useGameStore((s) => s.botReasons);
  const undoCount = useGameStore((s) => s.undoStack.length);
  const showAll = useGameStore((s) => s.showAll);
  const trackerOpen = useGameStore((s) => s.trackerOpen);
  const practiceSettings = useSettingsStore((s) => s.practice);
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
  const practice = mode === 'practice';
  const settled = heldTrick === null; // no finished trick still on show

  if (phase === 'GAME_OVER' && settled && resultSeenForSeed === seed) {
    return (
      <GameOver
        game={game}
        onPlayAgain={() => actions.newGame({ mode, difficulty: gameStore.getState().difficulty })}
        onHome={actions.exitToHome}
      />
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

  // Practice aids. The coach and tracker only ever use the human's PlayerView.
  const humanView = practice ? getPlayerView(game, HUMAN) : null;
  const legalIds: CardId[] | null =
    practice && practiceSettings.highlightLegal && humanToPlay
      ? getLegalCards(round.hands[HUMAN], round.currentTrick).map((c) => c.id)
      : null;
  const trumpHint = practice && humanChoosesTrump && humanView ? getTrumpHint(humanView) : null;
  const canUndo =
    practice &&
    practiceSettings.allowUndo &&
    undoCount > 0 &&
    (phase === 'PLAYING' || phase === 'ROUND_END');

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
    <main className={`table ${practice ? 'table--practice' : ''}`}>
      <div className="table__side">
        <header className="table__top">
          <div className="table__bar">
            <button
              type="button"
              className="icon-btn"
              aria-label={practice ? t('practice.exit') : t('game.exit')}
              title={practice ? t('practice.exit') : t('game.exit')}
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
            {practice && <span className="table__mode">{t('practice.title')}</span>}
            <LanguageToggle />
          </div>
          <div className="table__info">{info}</div>
        </header>

        {practice && coach && (
          <div className="table__coach">
            <CoachBubble
              key={coach.nonce}
              header={coach.header}
              lines={coach.lines}
              emptyText={coach.kind === 'bot' ? t('coach.botNoReason') : undefined}
              autoHide={coach.kind !== 'hint'}
              nonce={coach.nonce}
              onClose={actions.dismissCoach}
            />
          </div>
        )}

        {practice && trackerOpen && humanView && (
          <div className="table__tracker">
            <CardTracker view={humanView} onClose={actions.toggleTracker} />
          </div>
        )}
      </div>

      <section className="table__felt">
        {BOT_SEATS.map((seat) => (
          <Seat
            key={seat}
            seat={seat}
            cardCount={round.hands[seat].length}
            isDealer={round.dealer === seat}
            isActive={isActive(seat)}
            cards={practice && showAll ? round.hands[seat] : null}
          />
        ))}
        <div className="table__centre">
          <TrickArea
            trick={heldTrick?.trick ?? round.currentTrick}
            winner={heldTrick?.trick.winner ?? null}
            collectTo={heldTrick?.collecting ? heldTrick.trick.winner : null}
            canTap={humanToPlay && raisedCardId !== null}
            onTap={actions.tapTrickArea}
            onCardTap={practice ? actions.showBotReason : undefined}
            tappableIds={practice ? (Object.keys(botReasons) as CardId[]) : undefined}
          />
        </div>
        {humanChoosesTrump && <TrumpDialog onChoose={actions.chooseTrump} hint={trumpHint} />}
      </section>

      {practice && (
        <div className="table__tools" role="toolbar" aria-label={t('practice.tools')}>
          <HintButton
            icon="💡"
            label={t('practice.hint')}
            onClick={actions.requestHint}
            disabled={!humanToPlay}
          />
          {practiceSettings.allowUndo && (
            <HintButton
              icon="↶"
              label={t('practice.undo')}
              onClick={actions.undo}
              disabled={!canUndo}
            />
          )}
          <HintButton
            icon="👁"
            label={t('practice.showAll')}
            onClick={actions.toggleShowAll}
            pressed={showAll}
          />
          <HintButton
            icon="📋"
            label={t('practice.tracker')}
            onClick={actions.toggleTracker}
            pressed={trackerOpen}
          />
        </div>
      )}

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
          legalIds={legalIds}
          hintIds={hint && humanToPlay ? [hint.cardId] : undefined}
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
