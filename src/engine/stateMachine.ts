// createGame, applyAction (pure reducer), createRoundFromPreset and IllegalActionError. See SPEC §2, §3.1.
//
// Phase flow (a DEAL_* phase means "the next action deals that block"):
//   DEAL_FIRST --START_ROUND--> CHOOSE_TRUMP --CHOOSE_TRUMP--> DEAL_SECOND --DEAL_SECOND--> PLAYING
//   PLAYING --8th trick--> ROUND_END | GAME_OVER;  ROUND_END --NEXT_ROUND--> DEAL_FIRST (dealer rotates)
import { cardFromId } from './cards';
import { createDeck, dealBlocks, DECK_SIZE } from './deck';
import { mulberry32, randomInt, shuffle } from './rng';
import { getLegalCards, getTrickWinner, nextSeat, teamOf } from './rules';
import { scoreRound } from './scoring';
import type {
  Action,
  Card,
  CardId,
  GameSettings,
  GameState,
  Hands,
  Phase,
  RoundPreset,
  RoundResult,
  RoundState,
  Seat,
  Suit,
} from './types';

export const TRICKS_PER_ROUND = 8;

export type IllegalActionCode =
  'WRONG_PHASE' | 'NOT_YOUR_TURN' | 'NOT_TRUMP_CHOOSER' | 'CARD_NOT_IN_HAND' | 'MUST_FOLLOW_SUIT';

export class IllegalActionError extends Error {
  readonly code: IllegalActionCode;

  constructor(code: IllegalActionCode, message: string) {
    super(message);
    this.name = 'IllegalActionError';
    this.code = code;
  }
}

function emptyHands(): Hands {
  return [[], [], [], []];
}

function newRound(number: number, dealer: Seat): RoundState {
  const trumpChooser = nextSeat(dealer);
  return {
    number,
    dealer,
    trumpChooser,
    trump: null,
    hands: emptyHands(),
    secondBlock: emptyHands(),
    currentTrick: { leader: trumpChooser, plays: [] },
    completedTricks: [],
    tricksWon: [0, 0],
    turn: trumpChooser,
  };
}

/** A new game with a random (seeded) first dealer. Phase DEAL_FIRST: dispatch START_ROUND to deal. */
export function createGame(settings: GameSettings, seed: number): GameState {
  const rng = mulberry32(seed);
  const dealer = randomInt(rng, 4) as Seat;
  return {
    phase: 'DEAL_FIRST',
    settings,
    scores: [0, 0],
    pendingTieBonus: 0,
    round: newRound(1, dealer),
    roundHistory: [],
    rngState: rng.state,
  };
}

function requirePhase(state: GameState, phase: Phase, action: Action['type']): void {
  if (state.phase !== phase) {
    throw new IllegalActionError(
      'WRONG_PHASE',
      `${action} is not allowed in phase ${state.phase} (expected ${phase})`,
    );
  }
}

export function applyAction(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_ROUND':
      return startRound(state);
    case 'CHOOSE_TRUMP':
      return chooseTrump(state, action.seat, action.suit);
    case 'DEAL_SECOND':
      return dealSecond(state);
    case 'PLAY_CARD':
      return playCard(state, action.seat, action.cardId);
    case 'NEXT_ROUND':
      return nextRound(state);
  }
}

function startRound(state: GameState): GameState {
  requirePhase(state, 'DEAL_FIRST', 'START_ROUND');
  const rng = mulberry32(state.rngState);
  const deck = shuffle(createDeck(), rng);
  const { first, second } = dealBlocks(deck, state.round.dealer);
  return {
    ...state,
    phase: 'CHOOSE_TRUMP',
    rngState: rng.state,
    round: { ...state.round, hands: first, secondBlock: second, turn: state.round.trumpChooser },
  };
}

function chooseTrump(state: GameState, seat: Seat, suit: Suit): GameState {
  requirePhase(state, 'CHOOSE_TRUMP', 'CHOOSE_TRUMP');
  if (seat !== state.round.trumpChooser) {
    throw new IllegalActionError(
      'NOT_TRUMP_CHOOSER',
      `Seat ${seat} cannot choose trumps; seat ${state.round.trumpChooser} chooses`,
    );
  }
  return { ...state, phase: 'DEAL_SECOND', round: { ...state.round, trump: suit } };
}

function mergeBlocks(hands: Hands, second: Hands): Hands {
  return [
    [...hands[0], ...second[0]],
    [...hands[1], ...second[1]],
    [...hands[2], ...second[2]],
    [...hands[3], ...second[3]],
  ];
}

function dealSecond(state: GameState): GameState {
  requirePhase(state, 'DEAL_SECOND', 'DEAL_SECOND');
  const { round } = state;
  return {
    ...state,
    phase: 'PLAYING',
    round: {
      ...round,
      hands: mergeBlocks(round.hands, round.secondBlock),
      secondBlock: emptyHands(),
      currentTrick: { leader: round.trumpChooser, plays: [] },
      turn: round.trumpChooser,
    },
  };
}

function playCard(state: GameState, seat: Seat, cardId: CardId): GameState {
  requirePhase(state, 'PLAYING', 'PLAY_CARD');
  const { round } = state;
  if (seat !== round.turn) {
    throw new IllegalActionError('NOT_YOUR_TURN', `It is seat ${round.turn}'s turn, not ${seat}`);
  }
  const hand = round.hands[seat];
  const card = hand.find((c) => c.id === cardId);
  if (!card) {
    throw new IllegalActionError('CARD_NOT_IN_HAND', `Seat ${seat} does not hold ${cardId}`);
  }
  if (!getLegalCards(hand, round.currentTrick).some((c) => c.id === cardId)) {
    throw new IllegalActionError('MUST_FOLLOW_SUIT', `Seat ${seat} must follow suit`);
  }

  const hands = [...round.hands] as Hands;
  hands[seat] = hand.filter((c) => c.id !== cardId);
  const plays = [...round.currentTrick.plays, { seat, card }];

  if (plays.length < 4) {
    return {
      ...state,
      round: {
        ...round,
        hands,
        currentTrick: { leader: round.currentTrick.leader, plays },
        turn: nextSeat(seat),
      },
    };
  }

  // The trick is complete: the winner takes it and leads the next one.
  const trump = round.trump;
  const winner = getTrickWinner({ leader: round.currentTrick.leader, plays }, trump);
  const tricksWon: [number, number] = [...round.tricksWon];
  tricksWon[teamOf(winner)] += 1;
  const completedTricks = [
    ...round.completedTricks,
    { leader: round.currentTrick.leader, plays, winner },
  ];
  const afterTrick: GameState = {
    ...state,
    round: {
      ...round,
      hands,
      currentTrick: { leader: winner, plays: [] },
      completedTricks,
      tricksWon,
      turn: winner,
    },
  };
  return completedTricks.length === TRICKS_PER_ROUND ? endRound(afterTrick) : afterTrick;
}

function endRound(state: GameState): GameState {
  const { round, settings } = state;
  if (round.trump === null) throw new Error('endRound: no trump was chosen');
  const result = scoreRound(
    round.tricksWon,
    teamOf(round.trumpChooser),
    state.pendingTieBonus,
    settings,
  );
  const scores: [number, number] = [...state.scores];
  if (result.winner !== null) scores[result.winner] += result.points;
  const entry: RoundResult = {
    number: round.number,
    dealer: round.dealer,
    trumpChooser: round.trumpChooser,
    trump: round.trump,
    tricksWon: [...round.tricksWon],
    winner: result.winner,
    points: result.points,
    bonusApplied: result.bonusApplied,
    reason: result.reason,
    scoresAfter: [...scores],
  };
  const gameOver = scores.some((s) => s >= settings.targetScore);
  return {
    ...state,
    phase: gameOver ? 'GAME_OVER' : 'ROUND_END',
    scores,
    pendingTieBonus: result.pendingBonus,
    roundHistory: [...state.roundHistory, entry],
  };
}

function nextRound(state: GameState): GameState {
  requirePhase(state, 'ROUND_END', 'NEXT_ROUND');
  return {
    ...state,
    phase: 'DEAL_FIRST',
    round: newRound(state.round.number + 1, nextSeat(state.round.dealer)),
  };
}

/**
 * Replaces the current round with fixed hands, dealer and optional trump (lessons and tests).
 * Keeps the scores, tie bonus, history and round number. Without a trump the round waits in
 * CHOOSE_TRUMP with only the first block of 4 in each hand; with a trump it is ready to play.
 */
export function createRoundFromPreset(state: GameState, preset: RoundPreset): GameState {
  const cards = preset.hands.map((ids) => ids.map(cardFromId)) as Hands;
  validatePreset(cards);
  const round = newRound(state.round.number, preset.dealer);
  const first = cards.map((h) => h.slice(0, 4)) as Hands;
  const second = cards.map((h) => h.slice(4)) as Hands;
  if (preset.trump === undefined) {
    return {
      ...state,
      phase: 'CHOOSE_TRUMP',
      round: { ...round, hands: first, secondBlock: second },
    };
  }
  return {
    ...state,
    phase: 'PLAYING',
    round: { ...round, trump: preset.trump, hands: mergeBlocks(first, second) },
  };
}

function validatePreset(hands: readonly Card[][]): void {
  hands.forEach((hand, seat) => {
    if (hand.length !== 8) {
      throw new Error(`Preset: seat ${seat} has ${hand.length} cards, expected 8`);
    }
  });
  const ids = new Set(hands.flat().map((c) => c.id));
  if (ids.size !== DECK_SIZE) throw new Error('Preset: the 32 cards must all be different');
}
