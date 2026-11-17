// Shared helpers for engine tests.
import { cardFromId } from '../../src/engine/cards';
import { getLegalCards } from '../../src/engine/rules';
import { applyAction, createGame, createRoundFromPreset } from '../../src/engine/stateMachine';
import {
  DEFAULT_GAME_SETTINGS,
  type Card,
  type CardId,
  type GameSettings,
  type GameState,
  type RoundPreset,
  type Seat,
  type Trick,
} from '../../src/engine/types';

/** "AS 10H 7C" → cards. */
export function ids(list: string): Card[] {
  return list.trim().split(/\s+/).map(cardFromId);
}

/** trick(1, 'KH', 'AH') → leader 1 played KH, seat 2 played AH. */
export function trick(leader: Seat, ...cardIds: string[]): Trick {
  return {
    leader,
    plays: cardIds.map((id, i) => ({ seat: ((leader + i) % 4) as Seat, card: cardFromId(id) })),
  };
}

export function settings(overrides: Partial<GameSettings> = {}): GameSettings {
  return { ...DEFAULT_GAME_SETTINGS, ...overrides };
}

export type Picker = (state: GameState) => CardId;

/** Plays the first legal card in hand order. */
export const firstLegal: Picker = (state) => {
  const { round } = state;
  const card = getLegalCards(round.hands[round.turn], round.currentTrick)[0];
  if (!card) throw new Error('no legal card');
  return card.id;
};

/** Plays cards until the round ends (phase leaves PLAYING). */
export function playOutRound(state: GameState, pick: Picker = firstLegal): GameState {
  let s = state;
  while (s.phase === 'PLAYING') {
    s = applyAction(s, { type: 'PLAY_CARD', seat: s.round.turn, cardId: pick(s) });
  }
  return s;
}

/** From DEAL_FIRST: deal, let the chooser pick the suit of their first card, deal again. */
export function dealAndChoose(state: GameState): GameState {
  let s = applyAction(state, { type: 'START_ROUND' });
  const chooser = s.round.trumpChooser;
  const suit = s.round.hands[chooser][0]?.suit ?? 'S';
  s = applyAction(s, { type: 'CHOOSE_TRUMP', seat: chooser, suit });
  return applyAction(s, { type: 'DEAL_SECOND' });
}

/** Plays a whole game with first-legal play until GAME_OVER. */
export function playFullGame(seed: number, gameSettings = settings()): GameState {
  let s = createGame(gameSettings, seed);
  for (let guard = 0; guard < 200; guard++) {
    s = playOutRound(dealAndChoose(s));
    if (s.phase === 'GAME_OVER') return s;
    s = applyAction(s, { type: 'NEXT_ROUND' });
  }
  throw new Error('game did not end');
}

// Fixed presets: dealer 3, so seat 0 chooses trumps (spades) and leads.
// Seat 2 holds all diamonds and seat 3 all clubs, so only seats 0 and 1 compete.
const DIAMONDS: CardId[] = ['AD', 'KD', 'QD', 'JD', '10D', '9D', '8D', '7D'];
const CLUBS: CardId[] = ['AC', 'KC', 'QC', 'JC', '10C', '9C', '8C', '7C'];

function preset(seat0: CardId[], seat1: CardId[]): RoundPreset {
  return { dealer: 3, trump: 'S', hands: [seat0, seat1, DIAMONDS, CLUBS] };
}

export const PRESETS = {
  /** Seat 0 holds every trump: team 0 (the trump team) takes all 8 tricks. */
  kapothiTeam0: preset(
    ['AS', 'KS', 'QS', 'JS', '10S', '9S', '8S', '7S'],
    ['AH', 'KH', 'QH', 'JH', '10H', '9H', '8H', '7H'],
  ),
  /** Seat 0 wins 4 spade tricks, then seat 1 wins 4 heart tricks: 4–4. */
  tie: preset(
    ['AS', 'KS', 'QS', 'JS', '7H', '8H', '9H', '10H'],
    ['10S', '9S', '8S', '7S', 'JH', 'QH', 'KH', 'AH'],
  ),
  /** Team 0 (trump team) wins 3, team 1 (defenders) wins 5. */
  defendersWin: preset(
    ['AS', 'KS', 'QS', '7H', '8H', '9H', '10H', 'JH'],
    ['JS', '10S', '9S', '8S', '7S', 'QH', 'KH', 'AH'],
  ),
} satisfies Record<string, RoundPreset>;

export function playPreset(state: GameState, p: RoundPreset): GameState {
  return playOutRound(createRoundFromPreset(state, p));
}

export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}
