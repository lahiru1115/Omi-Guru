// Domain types: Card, Seat, Team, Trick, GameState, Action, PlayerView, GameSettings (SPEC §3, §10.1).
// Pure data only. Nothing here touches React, the DOM or storage.

export type Suit = 'S' | 'H' | 'D' | 'C'; // Spades, Hearts, Diamonds, Clubs
export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7';
export type CardId = `${Rank}${Suit}`; // e.g. "AS", "10H"
export type Card = { readonly id: CardId; readonly suit: Suit; readonly rank: Rank };

export type Seat = 0 | 1 | 2 | 3; // play order, anticlockwise; 0 = human
export type Team = 0 | 1; // team(seat) = seat % 2

export type Hands = [Card[], Card[], Card[], Card[]];

export type Play = { seat: Seat; card: Card };
export type Trick = { leader: Seat; plays: Play[]; winner?: Seat };

export type Phase =
  | 'DEAL_FIRST' // waiting for START_ROUND, which deals the first block of 4
  | 'CHOOSE_TRUMP' // waiting for the trump chooser
  | 'DEAL_SECOND' // trump chosen; waiting for DEAL_SECOND, which deals the second block of 4
  | 'PLAYING'
  | 'ROUND_END'
  | 'GAME_OVER';

export type RoundState = {
  number: number;
  dealer: Seat;
  trumpChooser: Seat; // next(dealer)
  trump: Suit | null;
  hands: Hands;
  // Addition to SPEC §3: the second block of 4 per seat, held back until DEAL_SECOND so the
  // trump chooser really sees only 4 cards. Never exposed in PlayerView.
  secondBlock: Hands;
  currentTrick: Trick;
  completedTricks: Trick[];
  tricksWon: [number, number];
  turn: Seat;
};

export type ScoreReason = 'TRUMP_TEAM_WIN' | 'DEFENDER_WIN' | 'KAPOTHI' | 'TIE';

// Not defined in the SPEC: one entry per scored round, for the result modal and stats.
export type RoundResult = {
  number: number;
  dealer: Seat;
  trumpChooser: Seat;
  trump: Suit;
  tricksWon: [number, number];
  winner: Team | null;
  points: number; // includes bonusApplied
  bonusApplied: number; // tie bonus added to this round's winner
  reason: ScoreReason;
  scoresAfter: [number, number];
};

export type Language = 'si' | 'en';
export type BotDifficulty = 'easy' | 'medium' | 'hard';
export type Speed = 'slow' | 'normal' | 'fast';

// SPEC §10.1. The engine reads only the rule fields (targetScore, *Points, tieBonus, stackTieBonus).
export type GameSettings = {
  language: Language;
  targetScore: number;
  trumpTeamWinPoints: number;
  defenderWinPoints: number;
  kapothiPoints: number;
  tieBonus: number;
  stackTieBonus: boolean;
  botDifficulty: BotDifficulty;
  speed: Speed;
  oneTapPlay: boolean;
  fourColorDeck: boolean;
  practice: { highlightLegal: boolean; autoFeedback: boolean; allowUndo: boolean };
  botNames: [string, string, string, string];
  unlockAllLessons: boolean;
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  language: 'si',
  targetScore: 10,
  trumpTeamWinPoints: 1,
  defenderWinPoints: 2,
  kapothiPoints: 3,
  tieBonus: 1,
  stackTieBonus: false,
  botDifficulty: 'medium',
  speed: 'normal',
  oneTapPlay: false,
  fourColorDeck: false,
  practice: { highlightLegal: true, autoFeedback: true, allowUndo: true },
  botNames: ['', 'කසුන්', 'අමල්', 'නිමාලි'],
  unlockAllLessons: false,
};

export type GameState = {
  phase: Phase;
  settings: GameSettings;
  scores: [number, number];
  pendingTieBonus: number;
  round: RoundState;
  roundHistory: RoundResult[];
  rngState: number; // seeded RNG state (mulberry32)
};

export type Action =
  | { type: 'START_ROUND' }
  | { type: 'DEAL_SECOND' }
  | { type: 'CHOOSE_TRUMP'; seat: Seat; suit: Suit }
  | { type: 'PLAY_CARD'; seat: Seat; cardId: CardId }
  | { type: 'NEXT_ROUND' };

// The only thing bots and the coach may see.
export type PlayerView = {
  seat: Seat;
  hand: Card[]; // own hand only
  handCounts: [number, number, number, number];
  trump: Suit | null;
  trumpChooser: Seat;
  dealer: Seat;
  turn: Seat; // addition to SPEC §3: public, and bots need it
  currentTrick: Trick;
  completedTricks: Trick[];
  tricksWon: [number, number];
  scores: [number, number];
  phase: Phase;
};

// Used by lessons and tests: fixed hands (8 per seat, all 32 cards), dealer and optional trump.
// hands[s].slice(0, 4) is the first block and hands[s].slice(4) the second.
export type RoundPreset = {
  dealer: Seat;
  hands: [CardId[], CardId[], CardId[], CardId[]];
  trump?: Suit;
};
