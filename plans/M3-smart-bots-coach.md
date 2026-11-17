# M3: Smart bots + coach

## Context
M2 shipped a playable Real game, but every difficulty is wired to the Easy bot (`src/ai/botFactory.ts`),
and the `src/ai/` and `src/coach/` M3 files are one-line placeholders. M3 (docs/MILESTONES.md) adds the
card tracker, trump chooser, the Medium/Hard heuristic bot with reason codes, Hard's Monte Carlo check,
the coach engine (getHint / getTrumpHint / reviewMove / equivalence), all coach texts in si+en, the
scenario and simulation tests from SPEC §12, and a difficulty picker before Real games.
Branch: `feature/m3-smart-bots-coach` (already checked out). First step: copy this plan to
`plans/m3-smart-bots-coach.md` (memory rule).

## Rules to respect (CLAUDE.md)
- ai/coach are pure TS: no React/DOM/Zustand/localStorage, no `Math.random`, no `performance.now`
  (deterministic). Randomness only via `mulberry32` from `src/engine/rng.ts`.
- Bots and coach get only `PlayerView`. Rules only via engine `getLegalCards`, `getTrickWinner`, `ledSuit`,
  `nextSeat`, `teamOf`, `compareRank`, `rankValue` (`src/engine/rules.ts`, `cards.ts`).
- Coach returns codes + raw params (cardId / suit); the UI translates. New text in both si.json and en.json.

## 1. `src/ai/` modules

**`viewSeed.ts`** (new) — move `hashString` + `fingerprint` out of `easyBot.ts` so Easy and Hard share
the per-decision seed. `easyBot.ts` imports them (behaviour unchanged).

**`cardTracker.ts`** — public knowledge, separate from the hand so playouts can share it:
```ts
type TrackerMode = 'full' | 'basic';
type CardTracker = { mode; trump; played: Set<CardId>; voids: [Set<Suit>×4] };
buildTracker(view, mode): CardTracker      // folds completedTricks + currentTrick
trackPlay(tracker, play, led): void         // incremental, used inside Monte Carlo playouts
isVoid(t, seat, suit), masterOf(t, suit, hand): Card|null, isMaster(t, card),
trumpsRemaining(t), trumpsOutsideHand(t, hand)
```
- `full`: all played cards + voids (player didn't follow led suit ⇒ void).
- `basic` (Medium, "without voids or master tracking"): remembers only the current trick, never records
  voids. So Medium's "master" is the highest card not in its hand or the current trick (e.g. it thinks
  the Ace is still out even after it was played in trick 2).

**`trumpChooser.ts`** — `scoreSuits(hand): SuitScore[]` with `{suit, count, points, score = 2·count+points,
top}` (A4 K3 Q2 J1), sorted by score then top card; `chooseTrumpSuit(hand)` = first. Easy keeps
`longestSuit`.

**`heuristicBot.ts`** — `chooseHeuristicCard(view, tracker): Decision` implementing SPEC §4.4 exactly,
plus `createHeuristicBot(mode)` (Medium = `basic`). Helpers: current winner via `getTrickWinner` on the
partial trick, `position = plays.length` (0 lead … 3 last), partner = `(seat+2)%4`.
- Lead: CASH_MASTER (non-trump master, no opponent known void) → DRAW_TRUMPS (my team chose, ≥4 trumps,
  highest trump) → LEAD_PARTNER_VOID (partner void, no opponent void, trumps still out) → lowest of
  longest non-trump suit excluding opponent-void suits: `[LEAD_LONG_SUIT]`, plus `AVOID_OPPONENT_RUFF`
  when the exclusion changed the choice → only trumps (or only opp-void suits left): lowest card.
- Follow: ONLY_LEGAL → PARTNER_WINNING (I'm last or partner's card is master) → WIN_CHEAPLY (last,
  lowest winner) → 2nd hand CASH_MASTER / SECOND_HAND_LOW → 3rd hand WIN_CHEAPLY (lowest beating
  current winner) → DISCARD_LOW.
- Void: PARTNER_WINNING if partner likely keeps it (I'm last, or partner's card is the master of the led
  suit with no trump played and the remaining opponent not known void, or partner's trump is the highest
  trump outstanding) → discard lowest non-master card of my weakest non-trump suit → RUFF (opponent
  winning untrumped, lowest trump) → OVERRUFF (lowest beating trump) → `[DISCARD_LOW, SAVE_TRUMP?]`
  (lowest non-trump non-master; SAVE_TRUMP added when I hold trumps; fallbacks if only masters/trumps).
- "Lowest/least useful" tie-break: lowest rank, then shorter suit. All picks deterministic.

**`monteCarlo.ts`** — `monteCarloScores(view, candidates, rng, n=40): Map<CardId, number>`.
- `sampleDeal`: unknown cards = 32 − played − my hand; give them to the other three seats matching
  `handCounts` and `full` voids (most-constrained cards first; retry ≤20 times, then relax voids).
- Playout on a small mutable state (hands, current trick, tricks won, one shared `full` tracker updated
  with `trackPlay`); every seat plays `chooseHeuristicCard` with a cheap view built from that state.
  Trick winners come from `getTrickWinner`. Result = my team's total tricks for the round.
- Skip simulation when the candidates collapse to one equivalence class (reuse coach `equivalence`
  logic — move the pure helper into `src/ai/equivalence.ts`, re-exported from `src/coach/equivalence.ts`).

**`hardBot.ts`** — `createHardBot(seed)`: trump via `chooseTrumpSuit`; card = heuristic (`full`). If
`completedTricks.length >= 3` and >1 legal card, run MC with rng seeded `seed ^ fingerprint(view)`;
take the best average unless the heuristic card is within 0.1 tricks (then keep it with its reasons;
otherwise reasons = []). N=40 fixed for determinism; if p95 test fails, lower the constant.

**`botFactory.ts`** — easy → Easy, medium → `createHeuristicBot('basic')`, hard → `createHardBot(seed)`.

## 2. `src/coach/`
- **`equivalence.ts`** — `areEquivalent(a, b, view)`: same suit and every rank strictly between them is
  already played (completed + current trick) or in my hand. `equivalenceClass(card, cards, view)`.
- **`hintEngine.ts`** — `getHint(view)` = `chooseHeuristicCard(view, buildTracker(view,'full'))` (never
  MC). `getTrumpHint(view)` = `{suit, count, highCards (A/K/Q/J of that suit), ranking: scoreSuits(hand)}`.
- **`review.ts`** — `reviewMove(viewBefore, playedCardId)`: best = getHint. GOOD if equivalent to best
  (mistakes = []); else detect mistakes; OK if none; else BETTER_EXISTS. Mistake rules:
  - OVERTOOK_PARTNER: followed suit over partner's winning card when a lower legal card existed.
  - TRUMPED_PARTNER: void, partner winning, played a trump.
  - WASTED_HIGH_CARD: card doesn't beat the current winner and isn't equivalent to my lowest legal card.
  - UNNECESSARY_TRUMP: led a trump (best wasn't DRAW_TRUMPS) while holding a winning non-trump master.
  - LED_INTO_RUFF: led a non-trump suit an opponent is known void in.
  - THREW_MASTER: played a non-trump master that doesn't take the trick, with a non-master alternative.
  - OVERPAID_WIN: card wins now, a lower non-equivalent legal card also wins, and I'm last or both are
    trumps (ruff). `{best}` = that lowest winner.
- **`reasons.ts`** — `REASON_KEY`, `MISTAKE_KEY`, `VERDICT_KEY` maps (`satisfies Record<…, MessageKey>`)
  and `coachParams(code, view, cardId, extra?) → {card?: CardId, suit?: Suit, best?: CardId}`
  (e.g. RUFF suit = led suit, AVOID_OPPONENT_RUFF suit = an opponent-void suit I hold).
- **`src/ui/coachText.ts`** (new, UI side) — turns `{key, params}` into a string: `card` → "K♠︎" via
  `SUIT_SYMBOL`, `suit` → `t('suit.X')`. Used in M4; covered by a small unit test now.

## 3. i18n (si.json + en.json, exact SPEC texts)
`reason.<CODE>` ×13 (§5.2), `mistake.<CODE>` ×7 (§5.3), `verdict.GOOD|OK|BETTER_EXISTS` (§5.4),
`trumpHint.text` (§5.5), plus picker strings: `difficulty.title`, `difficulty.easy|medium|hard`
(පහසු / සාමාන්‍ය / අමාරු), `difficulty.easyDesc|mediumDesc|hardDesc`, `difficulty.start`,
`difficulty.back`. Existing `tests/content/i18n.test.ts` checks parity.

## 4. Difficulty picker (UI)
- `gameStore.newGame(options?: { seed?: number; difficulty?: BotDifficulty })`; default difficulty =
  `deps.getSettings().botDifficulty` (removes the hard-coded `'easy'`). Continue already restores
  `saved.difficulty`.
- `Home.tsx`: "සැබෑ ගේම" opens an inline picker panel (same pattern as the confirm panel): three
  radio-style buttons (≥44 px, name + one-line description), default = `settings.botDifficulty`, Start and
  Back. Start → `updateSettings({botDifficulty})`, then the existing save-overwrite confirm if `hasSave`,
  then `newGame({difficulty})`. Styles in `home.css`, works at 375×667 and 1366×768.
- `GameTable` "Play again" → `newGame({ difficulty: current store difficulty })`.

## 5. Tests
Shared helper `tests/ai/helpers.ts`: `viewFrom({seat, hand, trump, chooser, dealer, completed, current,
handCounts})` building a PlayerView from card-id strings (reuse `ids`/`trick` from
`tests/engine/helpers.ts`).

- `tests/ai/cardTracker.test.ts` — played set, void detection, masters after plays, basic mode forgets.
- `tests/ai/trumpChooser.test.ts` — scoring, tie on higher top card, differs from Easy's longest-suit.
- `tests/ai/heuristicBot.test.ts` — one scenario per branch → expected card + reason (SPEC §12 examples:
  partner winning → lowest + PARTNER_WINNING; last & can win → lowest winner + WIN_CHEAPLY; void vs
  opponent → lowest trump + RUFF; plus CASH_MASTER, DRAW_TRUMPS, LEAD_PARTNER_VOID, AVOID_OPPONENT_RUFF,
  SECOND_HAND_LOW, OVERRUFF, DISCARD_LOW+SAVE_TRUMP, ONLY_LEGAL); Medium vs Hard differ when voids matter.
- `tests/ai/monteCarlo.test.ts` / `hardBot.test.ts` — sampled deals respect counts/voids/no duplicates,
  never contain my or played cards; Hard is deterministic; legal every time; uses heuristic before trick 4.
- `tests/ai/easyBot.test.ts` — update the "M2" factory test to the new mapping.
- `tests/coach/*.test.ts` — getHint matches heuristic and ignores hidden cards (same view ⇒ same hint
  regardless of other hands); getTrumpHint; equivalence (8♣/7♣, gaps closed by played cards); reviewMove
  GOOD/OK/BETTER_EXISTS and each mistake code; reasons maps cover every code with an existing i18n key.
- `tests/store/gameStore.test.ts` — newGame uses the settings difficulty / explicit option.
- `tests/sim/` (`npm run test:sim`), shared runner `tests/sim/runGame.ts` (bots per seat, checks every
  card legal, 8 tricks per round, 32 unique cards per round, score totals = sum of round points, ends):
  - `invariants.test.ts`: 10,000 seeded games rotating Easy/Medium line-ups + 200 games including Hard.
  - `strength.test.ts`: 2,000 games each, teams swapped on alternate games to cancel seat bias:
    Medium vs Easy ≥ 60%, Hard vs Easy ≥ 70%; logs win rates. If Hard takes > ~10 min, split it into 4
    parallel shard files of 500 games (each asserts ≥ 70% and logs; I'll report the aggregate).
  - `timing.test.ts`: Hard decision time p95 ≤ 150 ms over ≥ 1,000 decisions (timing only in tests).

## Verification
1. `npm test` and `npm run test:sim` until green; `npm run lint`; `npm run build` (no TS errors).
2. `npm run dev`: at 375×667 and 1366×768 open Real game → picker → play a few tricks on Medium and Hard
   (bots respond within pacing; no lag), exit/Continue keeps difficulty.
3. Report: Medium-vs-Easy and Hard-vs-Easy win rates, Hard p95 decision time, sim runtimes.
4. Commit on the branch only when asked.
