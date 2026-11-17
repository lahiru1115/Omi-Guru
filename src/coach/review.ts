// reviewMove (SPEC §5.1, §5.3): compares the human's card with the coach's best card.
// - GOOD: the played card is equivalent to the best card.
// - OK: a different card, but no mistake was detected.
// - BETTER_EXISTS: a different card with at least one detected mistake.
import type { ReasonCode } from '../ai/bot';
import { buildTracker, isMaster, isVoid, type CardTracker } from '../ai/cardTracker';
import { areEquivalent, knownCards } from '../ai/equivalence';
import { lowest, opponentsOf, partnerOf, winningPlay, winsIfPlayed } from '../ai/handHelpers';
import { rankValue } from '../engine/cards';
import { getLegalCards } from '../engine/rules';
import type { Card, CardId, PlayerView } from '../engine/types';
import { getHint } from './hintEngine';

export type MistakeCode =
  | 'OVERTOOK_PARTNER'
  | 'TRUMPED_PARTNER'
  | 'WASTED_HIGH_CARD'
  | 'UNNECESSARY_TRUMP'
  | 'LED_INTO_RUFF'
  | 'THREW_MASTER'
  | 'OVERPAID_WIN';

export type Verdict = 'GOOD' | 'OK' | 'BETTER_EXISTS';

export type Review = {
  verdict: Verdict;
  bestCardId: CardId;
  bestReasons: ReasonCode[];
  mistakes: MistakeCode[];
};

/** The lowest legal card that would win the trick right now, if any. */
export function lowestWinner(view: PlayerView): Card | undefined {
  const legal = getLegalCards(view.hand, view.currentTrick);
  const winners = legal.filter((c) => winsIfPlayed(view.currentTrick, view.seat, c, view.trump));
  return lowest(winners, view.hand);
}

/** J and above count as high cards when discarded from another suit. */
const HIGH_CARD_MIN = rankValue('J');

function isNonTrumpMaster(tracker: CardTracker, card: Card): boolean {
  return card.suit !== tracker.trump && isMaster(tracker, card);
}

/** The mistakes a played card makes in this position (empty when none are detected). */
export function detectMistakes(
  view: PlayerView,
  played: Card,
  bestReasons: readonly ReasonCode[],
): MistakeCode[] {
  const tracker = buildTracker(view, 'full');
  const known = knownCards(view);
  const trick = view.currentTrick;
  const trump = view.trump;
  const legal = getLegalCards(view.hand, trick);
  const position = trick.plays.length;
  const opponents = opponentsOf(view.seat);
  const mistakes: MistakeCode[] = [];

  if (position === 0) {
    const ruffable = (suit: Card['suit']): boolean =>
      opponents.some(
        (o) => isVoid(tracker, o, suit) && (trump === null || !isVoid(tracker, o, trump)),
      );
    if (played.suit !== trump && ruffable(played.suit)) mistakes.push('LED_INTO_RUFF');
    if (
      played.suit === trump &&
      !bestReasons.includes('DRAW_TRUMPS') &&
      view.hand.some((c) => isNonTrumpMaster(tracker, c) && !ruffable(c.suit))
    ) {
      mistakes.push('UNNECESSARY_TRUMP');
    }
    return mistakes;
  }

  const led = trick.plays[0]?.card.suit;
  const winner = winningPlay(trick, trump);
  const partnerWinning = winner.seat === partnerOf(view.seat);
  const wins = (c: Card): boolean => winsIfPlayed(trick, view.seat, c, trump);
  const playedWins = wins(played);

  if (partnerWinning && played.suit === led && playedWins && legal.some((c) => !wins(c))) {
    mistakes.push('OVERTOOK_PARTNER');
  }
  if (partnerWinning && played.suit === trump && led !== trump) {
    mistakes.push('TRUMPED_PARTNER');
  }

  if (!playedWins) {
    const otherOptions = legal.filter((c) => c.id !== played.id);
    if (
      isNonTrumpMaster(tracker, played) &&
      otherOptions.some((c) => !isNonTrumpMaster(tracker, c))
    ) {
      mistakes.push('THREW_MASTER');
    } else {
      // A lower card of the same suit (not equivalent) would have done the same job, or a high
      // card / trump was thrown away while a lower card of another suit was available.
      const lowestSameSuit = lowest(
        legal.filter((c) => c.suit === played.suit),
        view.hand,
      );
      const notLowestInSuit =
        lowestSameSuit !== undefined && !areEquivalent(played, lowestSameSuit, view, known);
      const lowerElsewhere = legal.some(
        (c) =>
          c.suit !== played.suit && c.suit !== trump && rankValue(c.rank) < rankValue(played.rank),
      );
      const wastedTrump =
        played.suit === trump && led !== trump && legal.some((c) => c.suit !== trump);
      const wastedHigh =
        played.suit !== trump && rankValue(played.rank) >= HIGH_CARD_MIN && lowerElsewhere;
      if (notLowestInSuit || wastedTrump || wastedHigh) mistakes.push('WASTED_HIGH_CARD');
    }
  }

  if (playedWins && !partnerWinning) {
    const cheapest = lowestWinner(view);
    const ruffing = played.suit === trump && led !== trump;
    if (
      cheapest !== undefined &&
      cheapest.suit === played.suit &&
      !areEquivalent(cheapest, played, view, known) &&
      (position === 3 || ruffing)
    ) {
      mistakes.push('OVERPAID_WIN');
    }
  }
  return mistakes;
}

export function reviewMove(viewBefore: PlayerView, playedCardId: CardId): Review {
  const played = viewBefore.hand.find((c) => c.id === playedCardId);
  if (!played) throw new Error(`reviewMove: ${playedCardId} is not in the hand`);
  const legal = getLegalCards(viewBefore.hand, viewBefore.currentTrick);
  if (!legal.some((c) => c.id === playedCardId)) {
    throw new Error(`reviewMove: ${playedCardId} is not a legal card`);
  }
  const hint = getHint(viewBefore);
  const best = viewBefore.hand.find((c) => c.id === hint.cardId);
  const base = { bestCardId: hint.cardId, bestReasons: hint.reasons };
  if (best && areEquivalent(played, best, viewBefore)) {
    return { ...base, verdict: 'GOOD', mistakes: [] };
  }
  const mistakes = detectMistakes(viewBefore, played, hint.reasons);
  return { ...base, verdict: mistakes.length > 0 ? 'BETTER_EXISTS' : 'OK', mistakes };
}
