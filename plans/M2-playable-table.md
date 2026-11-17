# M2: Playable table (Real game, Easy bots)

## Context
M1 delivered a pure, tested engine (`src/engine/`). M2 makes it playable: a full Real game to
`targetScore` against Easy bots on iPhone portrait (375×667) and PC landscape (1366×768). The UI
drives the engine only through `applyAction` via a Zustand store, all text goes through `t()`
(si + en), and the game auto-saves so Home can offer Continue. Work happens on the existing
branch `feature/m2-playable-table`; at the start, copy this plan to `plans/m2-playable-table.md`.

**Out of scope (later milestones):** difficulty picker, Medium/Hard bots (M3); Practice aids (M4);
Settings/Stats screens, stats recording, 4-colour polish (M5). The 4-colour flag is still read by
`Card` so M5 only needs the toggle.

## 1. Settings store grows to full `GameSettings`
`src/store/settingsStore.ts`: hold the full `GameSettings` (`DEFAULT_GAME_SETTINGS` from
`src/engine/types.ts`), loaded by merging the saved object over defaults with per-field type
checks (keeps old `{language}` saves valid). Keep `setLanguage`; add a generic `updateSettings(partial)`.
`src/content/i18n/t.ts` `Language` stays the single type (engine's `Language` is identical; re-export
or align). `useT` unchanged.

## 2. Bot interface + Easy bot (`src/ai/`, pure)
- `src/ai/bot.ts`: `ReasonCode` union (all SPEC §5.2 codes), `Decision = { cardId; reasons }`,
  `interface Bot { chooseTrump(view): Suit; chooseCard(view): Decision }`. Only `PlayerView` in.
- `src/ai/easyBot.ts`: `createEasyBot(seed: number): Bot`.
  - `chooseTrump`: suit with the most cards in the 4-card hand; tie → higher top card (`compareRank`).
  - `chooseCard`: `getLegalCards(view.hand, view.currentTrick)`, pick one with
    `mulberry32(seed ^ fingerprint(view))` where the fingerprint hashes seat, hand ids and played
    card count. Stateless and deterministic, so a resumed game replays identically. Reasons:
    `['ONLY_LEGAL']` when one legal card, else `[]`.
- `src/ai/botFactory.ts` (small): `createBot(difficulty, seed)`; returns Easy for every level in M2
  (M3 replaces medium/hard).

## 3. Game store (`src/store/gameStore.ts`)
Built as `createGameStore(deps)` (deps: `setTimeout/clearTimeout`, `createBot`, `save/load/clear`,
`getSettings`, `newSeed`) plus a default `useGameStore` instance, so tests inject fake timers.

State: `game: GameState | null`, `mode: 'real'`, `seed`, `difficulty`, and UI-only fields:
`raisedCardId`, `shake: { cardId, nonce } | null`, `toast: { key, params, nonce } | null`,
`heldTrick: { trick, winner, collecting: boolean } | null` (the engine clears `currentTrick` on the
4th card, so the store keeps the finished trick on screen, then animates collection).

Actions:
- `newGame()` → `createGame(settings, seed)` then `advance()`.
- `continueGame()` → load saved, `advance()`.
- `chooseTrump(suit)` (human, seat 0).
- `tapCard(cardId)` / `tapTrickArea()`: only on seat 0's turn in `PLAYING`. Illegal (not in
  `getLegalCards`) → set `shake` + toast `game.mustFollowSuit` with `{suit}` = led suit name; state
  unchanged (SPEC §2.6, Real mode: no dimming). Legal → raise; second tap (or trick-area tap, or
  `oneTapPlay`) dispatches `PLAY_CARD`.
- `nextRound()` from the result modal; `exitToHome()` (saves, clears timers).
- `dispatch(action)` is the single place calling `applyAction`; then saves and calls `advance()`.

`advance()` (driver, one pending timer at a time), delay `d = BOT_DELAY_MS[speed]`
(`src/store/pacing.ts`: slow 1200 / normal 700 / fast 350, SPEC §4.6):
- `heldTrick` set → after `d` set `collecting`, after ~400 ms clear it and continue.
- `DEAL_FIRST` → after `d` dispatch `START_ROUND`; `DEAL_SECOND` → after `d` dispatch `DEAL_SECOND`.
- `CHOOSE_TRUMP` → bot chooser: after `d`, `bot.chooseTrump(getPlayerView(game, chooser))`, toast
  `game.trumpChosenBy`; human: wait for the dialog.
- `PLAYING` → bot turn: after `d`, `bot.chooseCard(getPlayerView(...))`; human: wait.
- `ROUND_END` / `GAME_OVER` → wait for the user (modal / game-over screen).
Bots only ever receive `getPlayerView(state, seat)`.

## 4. Auto-save / Continue (SPEC §7, §10.2)
`src/store/savedGame.ts`: `SavedGame = { v: 1, mode: 'real', difficulty, seed, state: GameState }`,
`saveGame / loadSavedGame / clearSavedGame / hasSavedGame` over `persist.ts` (`STORAGE_KEYS.savedGame`),
with an `isSavedGame` guard (shape + known phase) so corrupt data is ignored. Save after every
dispatched action (covers "after every trick"); clear on `GAME_OVER`. Home reads `hasSavedGame()`.

## 5. UI
Navigation: `App.tsx` renders `GameTable` while `useGameStore(s => s.game) !== null`, else `Home`.
- `Home.tsx`: Continue button (primary) when a save exists; සැබෑ ගේම enabled → if a save exists,
  a small confirm ("start a new game? the saved one will be lost"), then `newGame()`. Others stay
  disabled.
- `GameTable.tsx` (SPEC §8.2): CSS grid — top bar (exit ←, `ScoreBar`, `TrumpBadge` with tricks
  `2 – 1` and tie-bonus badge), `Seat` top/left/right (name from `settings.botNames`, seat 0 =
  `seat.you`, card-back fan by `handCounts`, dealer chip D, active-turn glow), `TrickArea` centre,
  `Hand` bottom with `env(safe-area-inset-bottom)`. Overlays: `TrumpDialog`, `RoundResult`,
  `Toast`; `GameOver` replaces the table on `GAME_OVER` (after the held trick clears).
  Landscape (`orientation: landscape` and `min-width: 900px`): table centred with a right side panel
  holding scores/trump/tricks (reserved slot for M4 coach + tracker). Short landscape phones get a
  compact `max-height` variant.
- `Card.tsx` / `CardBack.tsx` (SPEC §8.3): inline SVG, English rank letters, red ♥♦ / black ♠♣,
  `fourColorDeck` variant (♦ blue, ♣ green), U+FE0E on pips, original back pattern; `aria-label`
  via `t('card.label', {rank, suit})`. Sizes from CSS vars scaled with `clamp()`.
- `Hand.tsx`: overlapped fan, sorted by `src/ui/sortHand.ts` (pure: trump suit first, then
  alternating colours, high→low; default order when trump is null). Raised card lifts; shake via
  CSS keyframe keyed by `nonce`. 44 px min tap width per card, `touch-action: manipulation`.
- `TrickArea.tsx`: each play sits on its player's side; enters from that seat's direction; when
  `heldTrick.collecting`, all cards slide toward the winner's side.
- `TrumpDialog.tsx`: 4 suit buttons (symbol + name), human's 4 cards visible behind.
- `RoundResult.tsx` (SPEC §8.6): message by `RoundResult.reason` (+ bonus line when
  `bonusApplied > 0`), tricks per team, scores, "ඊළඟ වටය"; කැපෝති celebration (CSS suit-pip burst).
- `GameOver.tsx`: win/lose headline, final score, round-by-round list, "නැවත සෙල්ලම් කරන්න"
  (`newGame`) and "මුල් පිටුව".
- `Toast.tsx`, `ScoreBar.tsx` (tokens ●○ to `targetScore`), `TrumpBadge.tsx`, `Seat.tsx`.
- Styles: `src/ui/styles/game.css` (+ small per-component files if large). Animations are CSS
  transforms only (deal stagger per block, play-in, collect, kapothi); the existing global
  `prefers-reduced-motion` rule disables them.

## 6. i18n
Add to **both** `si.json` and `en.json`: `suit.S|H|D|C` (glossary names), `seat.you`, `team.us`
(අපි) / `team.them` (ඔවුන්), `game.trump`, `game.tricks`, `game.tieBonusBadge`, `game.dealer`,
`game.yourTurn`, `game.exit`, `game.mustFollowSuit` (SPEC §2.6 text), `game.trumpChoosing`,
`game.trumpChosenBy`, `card.label`, `trump.title`, `trump.prompt`, `round.title`,
`round.trumpTeamWin|defenderWin|kapothi|tie|bonus` (SPEC §8.6 texts), `round.next`,
`gameOver.won|lost|score|playAgain|home|history`, `home.newGameConfirm|confirmYes|confirmNo`.
The existing `tests/content/i18n.test.ts` enforces parity.

## 7. Tests (node, Vitest)
- `tests/ai/easyBot.test.ts`: always legal (many seeded full games of 4 Easy bots driven only by
  `getPlayerView`), deterministic for same seed + view, trump = longest suit with tie-break.
- `tests/store/gameStore.test.ts` (fake timers, injected deps): new game advances to the human's
  decision; no bot move before the speed delay; illegal tap → shake/toast, state unchanged; raise
  then play; one-tap setting; full game to `GAME_OVER` with the human auto-picking legal cards;
  saved after each trick; `continueGame` restores the same state; save cleared at game over.
- `tests/store/savedGame.test.ts`: guard rejects corrupt/old data; round-trip.
- `tests/store/settingsStore.test.ts` (or extend existing): merge over defaults.
- `tests/ui/sortHand.test.ts`.

## Verification
1. `npm test`, `npm run lint`, `npm run build` — all clean, no TS errors.
2. `npm run dev`, open in a browser at 375×667 portrait and 1366×768 landscape (DevTools device
   mode / browser tool): play a full game to 10 in Sinhala, toggle EN, tap an illegal card (shake +
   message), finish a round (result modal), reload mid-round → Home shows Continue and resumes,
   reach game over → Continue disappears. Check reduced-motion via DevTools emulation.
