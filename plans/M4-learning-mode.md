# M4: Learning mode (Practice + 8 Lessons)

## Context
M3 shipped smart bots and a pure coach engine (`getHint`, `getTrumpHint`, `reviewMove`, `reasonMessage` /
`mistakeMessage` / `verdictMessage` / `trumpHintMessage` in `src/coach/`, `coachText()` in `src/ui/coachText.ts`),
but nothing in the UI uses the coach yet. Home's Learn / Rules buttons are disabled; `LessonList`, `LessonPlayer`,
`Rules`, `CoachBubble`, `HintButton`, `CardTracker`, `progressStore` and `rules/*.md` are empty placeholders.
M4 (docs/MILESTONES.md) adds Practice with every SPEC §6.1 aid, the lesson engine + list + player, all 8 lessons
(si + en), saved progress, the Rules screen with glossary, and the SPEC §12 content tests.
Branch `feature/m4-learning-mode` (checked out). First step: copy this plan to `plans/M4-learning-mode.md`.

## Decisions (defaults I'm taking; say if you want otherwise)
- **Practice games are not saved** to `omi.savedGame.v1` (one slot; it would overwrite your Real game). Leaving
  Practice ends it. Continue still means the Real game.
- **Practice runs on Medium at Slow speed** (SPEC §6.1). The practice aid toggles already exist in
  `GameSettings.practice` and are respected; the full Settings screen stays in M5. "Unlock all lessons" gets a
  small toggle on the Lesson list (same setting M5 will show).
- Small, marked additions to the SPEC §6.2 types (like `types.ts` already does): `chooseTrump` and `play` steps
  may carry a `preset` (lesson 5 needs 3 different 4-card hands); `explain` may carry a `scoreExample`
  (lesson 6 scoreboard); a `play` step may set `retryKey`.
  _Added during implementation:_ a `choice` step (an in-lesson multiple-choice question, retried until
  right) so lesson 6 has interactive exercises; `retryKey` on `chooseTrump`/`cardPick`/`choice` too;
  `textKey` optional on bot plays; suit tokens like `[S]` alongside card tokens; `ScoreExample.afterTie`
  (bonus from settings) instead of a fixed `pendingBonus`.
- Cards inside lesson/rules text are written as tokens like `[AS]`, `[10H]` and rendered as coloured card chips
  (language-neutral, so si and en use the same tokens; a test checks this).
- Scoring numbers in lesson/rules text are placeholders (`{trumpWin}`, `{defWin}`, `{kapothi}`, `{tieBonus}`,
  `{target}`) filled from `GameSettings` (CLAUDE.md rule 6).

## 1. Navigation
- New `src/store/navStore.ts` (zustand): `screen: home | lessons | lesson(id) | rules`. `App.tsx`: game in
  progress → `GameTable`; else switch on screen.
- `Home.tsx`: enable Learn → inline panel (same pattern as the difficulty panel) with **පාඩම්** and **පුහුණුව**;
  enable **නීති** (Rules). Stats/Settings stay disabled (M5).

## 2. Practice mode (SPEC §6.1)
**Store (`src/store/gameStore.ts`)** — `GameMode = 'real' | 'practice'` (`savedGame.ts` still accepts only real).
- `newGame({ mode, difficulty, seed })`; practice → difficulty `medium`, speed forced `slow` in `advance()`,
  `persist()` and `exitToHome()` skip storage for practice.
- New data: `hint: Decision | null`, `coach: CoachBubbleData | null`
  (`{ kind: 'hint'|'review'|'bot'|'trump'; header?: CoachMessage; lines: CoachMessage[]; nonce }`),
  `botReasons: Partial<Record<CardId, CoachMessage[]>>` (this round), `undoStack: GameState[]`, `showAll`,
  `trackerOpen`.
- `requestHint()` → `getHint(getPlayerView(game, 0))` → highlight card + bubble from `reasonMessage`.
- Human play in practice: before dispatch, if `practice.autoFeedback`, `reviewMove(viewBefore, cardId)` →
  bubble; if `practice.allowUndo`, push the pre-play state (stack cleared on `NEXT_ROUND` / new game, so ≤ 1 round).
- Bot play in practice: store `reasonMessage(code, botView, cardId)` for each reason under the card id
  (empty reasons from Hard MC / Easy → generic `coach.botNoReason`).
- `undo()`: cancel timer, restore top snapshot, clear held trick / hint / bubble, `advance()` (bots are
  deterministic, so the replay is the same). Allowed in PLAYING and ROUND_END.
- `tapCard`: in practice an illegal card is never tappable (no shake/toast).
- `toggleShowAll()`, `toggleTracker()`, `showBotReason(cardId)`, `dismissCoach()`, `pinCoach()`.

**Pure helper `src/coach/feedback.ts`** — `hintBubble(view, hint)` and `reviewBubble(viewBefore, playedId, review)`
→ `{ header, lines: CoachMessage[] }` (GOOD: verdict + best reasons; OK: verdict; BETTER_EXISTS: verdict + mistakes
+ best reasons). Unit tested.

**UI**
- `Hand.tsx`: new props `legalIds?` (dim + disable illegal when `highlightLegal`) and `hintId?` (glow).
- `components/CoachBubble.tsx`: renders header + lines via `coachText`; auto-hides after 3 s unless tapped
  (tap = keep open, ✕ closes); `aria-live="polite"`.
- `components/HintButton.tsx` + a practice toolbar row in `GameTable`: 💡 Hint, ↶ Undo (disabled when stack empty
  or `allowUndo` off), 👁 Show all, 📋 Tracker. 44 px targets, labels from i18n.
- `components/CardTracker.tsx`: drawer (bottom sheet portrait, right panel ≥ landscape breakpoint): 4×8 grid,
  played cards greyed, master ★ via `buildTracker(view,'full')` + `masterOf`, "හුරු ඉතුරු: n" via
  `trumpsRemaining` — built only from the human's `PlayerView`. Reused by lesson 8.
- `TrickArea.tsx`: root becomes a `div`; the "play here" tap stays a button; in practice each bot card is its own
  button → `showBotReason` (avoids nested buttons). Works for the held (finished) trick too.
- `Seat.tsx`: optional `cards` prop → face-up mini cards when Show all is on (UI only; bots/coach still use
  `PlayerView`).
- `TrumpDialog.tsx`: optional `hint: TrumpHint` → hint sentence (`trumpHintMessage` + `coachText`) and a small
  bar list of every suit's score from `hint.ranking`.
- Styles in `game.css` (coach bubble, toolbar, tracker, face-up seat cards), mobile-first; landscape side panel
  hosts bubble + tracker; `prefers-reduced-motion` respected.

## 3. Lesson engine
- `src/content/lessons/types.ts`: `Lesson`, `LessonStep`, `QuizQuestion`, `Highlight`
  (`{ cards?: CardId[]; area?: 'hand'|'trick'|'trump'|'score'|'tracker' }`), `ScoreExample`
  (`{ tricks: [n,n]; chooserTeam: Team; pendingBonus?: number }`). Keys typed as `MessageKey` so a missing key is
  a compile error.
- `src/lessons/lessonRunner.ts` (**pure**, added to the ESLint `PURE_CODE` list along with `src/content/lessons`):
  `LessonRun = { lesson, stage: 'steps'|'quiz'|'result', stepIndex, game: GameState|null, shownTrick, feedback,
  quiz: { index, answers, revealed } }` and pure transitions: `startLesson(lesson, settings)`, `next(run)`,
  `chooseTrump(run, suit)`, `humanPlay(run, cardId)`, `autoPlay(run)` (seats 1–3 scripted card), `pickCard(run, id)`,
  `answer(run, i)`, `nextQuestion(run)`, `quizScore(run)`, `isPassed` (≥ 2/3). Game positions come from
  `createRoundFromPreset` + `applyAction` (DEAL_SECOND right after a lesson trump choice). Wrong answers → `feedback =
  retry` (step-specific `retryKey`, or "must follow suit" when the card is illegal, else generic).
- `src/store/lessonStore.ts` (zustand): holds the `LessonRun`, runs auto-play steps and trick hold on Slow-pacing
  timers, records results to `progressStore`.
- `src/store/progressStore.ts`: `omi.progress.v1` = `{ v: 1, lessons: Record<id, { completed, bestScore }> }` via
  `persist.ts` (try/catch already there), validated on load; `recordQuiz(id, score)` keeps the best score and
  sets completed when ≥ 2. `isUnlocked(order)` = order 1, previous completed, or `unlockAllLessons`.

**UI**
- `screens/LessonList.tsx`: 8 cards (number, title, goal), ✓ when completed + best score, 🔒 when locked;
  "unlock all" toggle; back to Home.
- `screens/LessonPlayer.tsx`: header (back, lesson n/8, progress dots), lesson panel (text with `[AS]` chips via a
  small `LessonText` component, Next / feedback), and when the step needs it a compact table reusing `Seat`,
  `TrickArea`, `Hand`, `TrumpDialog` (with trump hint after a wrong pick), `CardTracker`; highlights add a glow
  class. `cardPick` shows large card buttons. `ScoreExample` component shows the animated scoreboard using engine
  `scoreRound` with current settings. Quiz screen: prompt, options, ✓/✗ + explanation, Next. Result: x/3, pass/fail,
  **ඊළඟ පාඩම** / **පුහුණු වෙන්න** (starts Practice) / **ආයෙත් කරන්න** when failed.
- Styles `src/ui/styles/lesson.css`; 375×667 and 1366×768.

## 4. The 8 lessons (`src/content/lessons/lesson1.ts` … `lesson8.ts`, `index.ts` exports the ordered list)
Text keys `lesson<N>.*` in **si.json + en.json**: simple, friendly Sinhala with SPEC §9.2 terms (හුරුව, අත, පාට,
කැපෝති, බෙදන්නා, partner, කණ්ඩායම, ලකුණු, වටය, මුලින් දානවා; "ඔයාගේ කාඩ්", never අත for a hand), English
words where people use them. Each: 3–6 explain steps, interactive steps, quizBreak, 3 quiz questions with
explanations (the SPEC table example is one of them).
1. කාඩ් හඳුනාගනිමු — 32 cards, 4 suits, A>K>Q>J>10>9>8>7; 4 × `cardPick` "tap the highest card".
2. පාට අනුගමනය — preset, dealer 0 so seat 1 leads ♥; human (last) must follow; `accept` = ♥ cards; retry explains why.
3. අතක් දිනන හැටි — 2 scripted tricks (no trumps played); after each, `cardPick` on the trick's 4 cards to predict
   the winner.
4. හුරුව — preset with trump; human is void in the led suit and ruffs (`accept` = trumps).
5. හුරුව තෝරන හැටි — 3 `chooseTrump` steps each with its own 4-card preset; `expected` = `getTrumpHint` suit (test
   checks this); wrong pick shows the hint and score bars.
6. ලකුණු — explain steps with `scoreExample`s: trump team 6 → {trumpWin}, defenders 5 → {defWin}, 8 → කැපෝති
   {kapothi}, 4–4 tie + bonus next round.
7. Partner එක්ක සෙල්ලම — scripted tricks: don't beat partner's ♣A (accept ♣8); lead to partner's known void.
8. කාඩ් මතක තියාගැනීම — scripted tricks then tracker walkthrough (highlight area 'tracker'): masters ★, voids,
   trumps left; `cardPick` "which card is the master now".

## 5. Rules reference screen
- `src/content/rules/si.md` + `en.md`: full rules (SPEC §2: players & cards, deal & trumps, playing tricks,
  scoring with settings placeholders, ties, game end, illegal moves) + glossary table (SPEC §9.2).
- `src/ui/markdown.ts`: tiny renderer for `#/##` headings, paragraphs, `-` lists, `| tables |`, `**bold**`
  (no new dependency; imported with Vite `?raw`; unit tested). `screens/Rules.tsx` renders the current language
  with a back button. New UI labels in i18n.

## 6. i18n
All new UI strings in both files: `learn.*`, `practice.*` (hint, undo, show all, tracker, trumps left, bot no
reason), `lessons.*` (list, locked, completed, best score, unlock all), `lessonPlayer.*` (next, retry messages,
quiz, result, next lesson, practise now, try again), `rules.*`, `lesson1.*`…`lesson8.*`.

## 7. Tests
- `tests/content/lessons.test.ts` (SPEC §12 Content): 8 lessons, unique ids, orders 1–8; every preset (lesson +
  step) has 32 unique cards, 8 per seat; walking every step with the engine: each scripted `play` is the seat on
  turn and legal, every `accept` card is legal (walk each accepted branch), human `chooseTrump` steps have the
  human as chooser and `expected` = trump hint; `cardPick` answer ∈ options (and = trick winner where it predicts
  one); each lesson has ≥ 1 explain, ≥ 1 interactive step and exactly 3 quiz questions with exactly one correct
  option; every key exists in si and en; `[card]` tokens valid and identical in si/en.
- `tests/content/rules.test.ts`: si.md and en.md have the same heading structure and placeholders; glossary terms
  present. Existing `i18n.test.ts` keeps key parity.
- `tests/lessons/lessonRunner.test.ts`: retry on wrong answers, auto plays, quiz scoring and pass at 2/3.
- `tests/store/progressStore.test.ts` (memoryStorage): save/load, best score kept, corrupt data ignored, unlock order.
- `tests/store/gameStore.test.ts` additions: practice not saved; hint; review bubble; bot reasons; undo restores the
  state before the human's last card incl. later bot plays; illegal tap ignored in practice; slow pacing.
- `tests/coach/feedback.test.ts`, `tests/ui/markdown.test.ts`.

## Verification
1. `npm test`, `npm run lint`, `npm run build` (no TS errors); `npm run test:sim` still green.
2. `npm run dev` at 375×667 and 1366×768: Practice — dimmed cards, hint, feedback bubble (3 s / tap to keep),
   tracker, tap a bot card, undo, show all, trump hint in dialog; Real game unchanged (no aids, save/Continue).
   Lessons — play all 8 in Sinhala and English, wrong answers retry, pass/fail, ✓ and unlock after reload,
   unlock-all; Rules screen in both languages.
3. Final message: the full Sinhala text of lesson 1 and lesson 5 (all steps + quiz + explanations) for wording review.
4. Commit only when asked.
