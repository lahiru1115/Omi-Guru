# M1: Game engine + tests

## Context
M0 is done: tooling works, and `src/engine/*.ts` are one-line placeholder comments. M1 adds the full Omi rules
as pure, immutable, deterministic TypeScript (SPEC §2, §3), plus the unit tests from SPEC §12 "Unit".
No UI in this milestone. Later milestones (bots, coach, lessons, UI) all build on this API, so it needs to be right.

Constraints I'll follow: `tsconfig` has `strict` + `erasableSyntaxOnly` (no enums, no constructor parameter
properties). ESLint already blocks React/DOM/Zustand/storage and `Math.random` in `src/engine`.

## Design decisions (where the SPEC leaves room)
1. **Phase flow**: a `DEAL_*` phase means "the next action deals that block".
   - `createGame(settings, seed)` → picks a random first dealer with the seeded RNG. Round 1, empty hands, phase `DEAL_FIRST`.
   - `START_ROUND` (in `DEAL_FIRST`) → shuffles, deals both blocks in order from `next(dealer)`. Only block 1 goes into
     `hands`, block 2 is held aside. Phase → `CHOOSE_TRUMP`, `turn = trumpChooser`.
   - `CHOOSE_TRUMP {seat, suit}` (the chooser only) → phase `DEAL_SECOND`.
   - `DEAL_SECOND` → moves block 2 into the hands. Phase → `PLAYING`, `turn = trumpChooser`, who leads the first trick.
   - `PLAY_CARD` → checks the phase, the turn, that the card is in hand, and `getLegalCards`. On the 4th card:
     sets `winner`, appends the trick to `completedTricks`, increments `tricksWon`, and the winner leads a new empty trick.
     After the 8th trick: `scoreRound`, push a `RoundResult` to `roundHistory`, update the scores and `pendingTieBonus`,
     phase → `GAME_OVER` if a team has ≥ `targetScore`, otherwise `ROUND_END`.
   - `NEXT_ROUND` (in `ROUND_END`) → `dealer = next(dealer)`, `number + 1`, a fresh empty round, phase `DEAL_FIRST`.
2. **Small additions to the SPEC §3 types** (all needed, and I'll note them in the code):
   - `RoundState.secondBlock: [Card[],Card[],Card[],Card[]]`: the cards held back until `DEAL_SECOND`. They are never in `PlayerView`.
     This way the trump chooser really sees only 4 cards.
   - `PlayerView.turn: Seat`: public information, and bots need it.
   - `scoreRound` returns a discriminated union. The tie case gets `reason: 'TIE'`, otherwise it matches §2.5 exactly.
     It also returns `bonusApplied`, for the "+{bonus}" message in §8.6.
   - `RoundResult` (not defined in the SPEC): `{ number, dealer, trumpChooser, trump, tricksWon, winner, points, bonusApplied, reason, scoresAfter }`.
3. **`GameSettings`**: the full SPEC §10.1 shape and `DEFAULT_GAME_SETTINGS` go in `types.ts`. The engine only reads the
   rule fields (`targetScore`, `*Points`, `tieBonus`, `stackTieBonus`). `settingsStore` stays as it is until it
   is merged in M5.
4. **`getTrickWinner(trick, trump)`** also works on a partial trick (it returns the current winner), because the M3 bots need that.
   It throws on an empty trick.
5. **`IllegalActionError extends Error`** with a `code`: `WRONG_PHASE | NOT_YOUR_TURN | NOT_TRUMP_CHOOSER | CARD_NOT_IN_HAND | MUST_FOLLOW_SUIT`.
   M2 uses `MUST_FOLLOW_SUIT` for the shake message.
6. **Immutability**: every transition copies what it changes. `getPlayerView` returns copied arrays.

## Files (`src/engine/`)
- `types.ts`: Suit, Rank, CardId, Card, Seat, Team, Play, Trick, Phase, RoundState, GameState, Action, PlayerView,
  GameSettings + `DEFAULT_GAME_SETTINGS`, RoundResult, RoundPreset `{ dealer: Seat; hands: [CardId[] ×4]; trump?: Suit }`.
- `cards.ts`: `SUITS`, `RANKS` (high→low), `rankValue(rank)`, `makeCard(rank, suit)`, `cardFromId(id)` (throws if invalid),
  `isCardId`, `compareRank`.
- `rng.ts`: `mulberry32(seed)` returns `{ next(): number; readonly state: number }` (the state can be saved in `GameState.rngState`
  and restored). `shuffle(cards, rng)` is a non-mutating Fisher–Yates.
- `deck.ts`: `createDeck()` (32 cards), `dealBlocks(deck, dealer)` returns `{ first, second }` per seat, 4 cards each,
  in seat order starting from `next(dealer)`, with the dealer last.
- `rules.ts`: `nextSeat(seat)` and `teamOf(seat)` (CLAUDE.md's `next` and `team`), `getLegalCards(hand, trick)`, `getTrickWinner(trick, trump)`.
- `scoring.ts`: `scoreRound(tricks, chooserTeam, pendingBonus, settings)`, the SPEC §2.5 reference.
- `stateMachine.ts`: `createGame`, `applyAction`, `createRoundFromPreset`, `IllegalActionError`.
  - Preset: validates 32 unique cards with 8 per seat. `hands[s].slice(0,4)` is block 1 and `slice(4)` is block 2. If there is no trump
    → phase `CHOOSE_TRUMP`. If there is a trump → both blocks go into the hands, phase `PLAYING`, `turn = trumpChooser`. Scores are kept.
- `view.ts`: `getPlayerView(state, seat)`.

## Tests (`tests/engine/`)
- `helpers.ts`: `ids('AS 10H 7C')` → Card[], `trick(leader, ...cardIds)`, `playOutRound(state, pick)` (plays the first legal card each turn),
  and `deepFreeze`.
- `cards.test.ts` / `deck.test.ts`: 32 unique cards, rank order A>K>…>7. `dealBlocks` gives 4+4 to each player, `next(dealer)` gets
  `deck[0..3]` and the dealer gets `deck[12..15]`, for every dealer 0–3. The same seed gives the same deal, and different seeds give different deals.
- `rng.test.ts`: reproducible, values in [0,1), restoring from `state` continues the same sequence, `shuffle` doesn't mutate its input.
- `rules.test.ts`: `getLegalCards` must follow suit, gives any card when void, and any card when leading. `getTrickWinner`: the led suit wins with no
  trumps, an off-suit discard never wins, the highest trump wins, a lone trump wins, and it works on a partial trick.
- `scoring.test.ts`: trump team 5/6/7 → 1; defenders 5/6/7 → 2; කැපෝති (8–0) for either team → 3; 4–4 → 0 + bonus;
  stacking on/off; the settings values are respected (custom numbers).
- `stateMachine.test.ts`:
  - The trump chooser = `next(dealer)`, they lead the first trick, and only they may choose trumps. The chooser has 4 cards during `CHOOSE_TRUMP`.
  - Dealer rotation over several rounds (`NEXT_ROUND` → `next(dealer)`).
  - Illegal actions throw with the right code (wrong phase, wrong turn, card not in hand, not following suit).
  - A full round: 8 tricks, all 32 cards played once, the winner leads the next trick, the tricks sum to 8.
  - The tie bonus goes to the next round's winner and is then reset (using presets that force a 4–4 result, then a win).
  - Game over at ≥ target: start from scores `[9,0]` and a winning preset → `GAME_OVER`, and `NEXT_ROUND` then throws.
  - Determinism: the same seed and the same actions give identical states. Immutability: a deep-frozen state survives every action.
  - `createRoundFromPreset` rejects duplicate cards or wrong counts.
- `view.test.ts`: in every phase, for every seat, the view holds only that seat's own cards (none of the other hands, no `secondBlock`).
  It also gets a check that the serialized view contains no hidden card ids.

## Steps
1. Copy this plan to `plans/M1-game-engine.md` (memory rule).
2. Implement the engine files in this order: types → cards → rng → deck → rules → scoring → stateMachine → view.
3. Write the tests, then run `npm test`, `npm run lint` and `npm run build` in PowerShell, and fix everything until they all pass.
4. No commit unless asked (MILESTONES has the owner commit `M1: game engine`).

## Verification
- `npm test`: all engine tests are green (plus the existing i18n/persist tests).
- `npm run lint`: no purity-rule violations in `src/engine`.
- `npm run build`: `tsc -b` has no type errors.
