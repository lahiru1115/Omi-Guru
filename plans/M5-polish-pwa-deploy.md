# M5: Polish, PWA and deploy

## Context
M0–M4 are merged into `develop`. The current branch `feature/m5-polish-pwa-deploy` is clean, and `origin` is
already on GitHub (`lahiru1115/Omi-Guru`). M5 (docs/MILESTONES.md) makes the app installable and offline (SPEC §11),
fills in the empty `Settings.tsx` and `Stats.tsx` stubs (SPEC §10.1, §10.3), polishes the animations (§8.4),
checks accessibility, and ends with instructions for deploying on Vercel.

What already exists and gets reused:
- `fourColorDeck` already flows through: `GameSettings`, `mergeSettings`, `suitColorClass()` in `src/ui/suits.ts`,
  `Card.tsx`, and the `.suit--blue/.suit--green` CSS. Only a Settings toggle is missing.
- The animations already exist: `deal-in`, `play-in`, `trick--collect trick--to-*` and the `kapothi-burst` keyframes
  in `game.css`. A global `prefers-reduced-motion` kill switch is in `global.css`. M5 refines these; it doesn't rewrite them.
- `persist.ts` already has `loadJSON/saveJSON/removeJSON` and `STORAGE_KEYS.stats`.
- `useSettingsStore.updateSettings(patch)`, `gameStore.newGame({ seed })`, `reviewMove()` (`src/coach/review.ts`),
  `Toast.tsx` and the `BackIcon` + header pattern from `Rules.tsx`.

Decisions you made:
- **PWA updates:** use `registerType: 'prompt'`. The toast has a Refresh button and nothing reloads on its own.
  This differs from the `autoUpdate` in SPEC §11, so I'll add a note to SPEC.
- **Stats:** games, rounds, කැපෝති and trump calls come from **Real** games. Hints used and coach match rate come from
  **Practice**. Lessons are not counted.

## 1. PWA (SPEC §11)
- **Logo:** `public/logo.svg` is an original mark made only of shapes (no text, so it renders anywhere): two
  fanned cream cards with ♠/♥ pips on a rounded table-green square, with a safe zone so it can be maskable. Also
  `public/favicon.svg`.
- **Icons:** add the devDependency `@vite-pwa/assets-generator` and `pwa-assets.config.ts`
  (`minimal2023Preset`, source `public/logo.svg`). Add the script `"generate-pwa-assets": "pwa-assets-generator"`.
  It produces `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png` and `apple-touch-icon-180x180.png`
  in `public/`. The PNGs are committed, so Vercel doesn't need to run sharp.
- **`vite.config.ts`:** `VitePWA({ registerType: 'prompt', includeAssets: [favicon, apple-touch], manifest: { name:
  'ඕමි ගුරු · Omi Guru', short_name: 'Omi Guru', description, lang: 'si', display: 'standalone', start_url: '/',
  theme_color/background_color: the felt green from global.css, icons: 192, 512, 512 maskable }, workbox: {
  globPatterns: ['**/*.{js,css,html,svg,png,woff2,woff,webmanifest}'], cleanupOutdatedCaches: true } })`. Then check
  in `dist/sw.js` that the Noto Sans Sinhala woff2 files are in the precache list.
- **`index.html`:** add a meta description and keywords (Omi, Oomi, Oombi, ඕමි, Sri Lankan card game, learn Omi),
  `theme-color`, `apple-mobile-web-app-capable`, `mobile-web-app-capable`,
  `apple-mobile-web-app-status-bar-style=black-translucent`, `apple-mobile-web-app-title`, the SVG favicon link and
  `apple-touch-icon`. The viewport tag already has `viewport-fit=cover`.
- **Types:** add `vite-plugin-pwa/react` and `vite-plugin-pwa/client` to `tsconfig.app.json` `types`.
- **`src/ui/components/UpdateToast.tsx`:** uses `useRegisterSW` from `virtual:pwa-register/react`. When
  `needRefresh` is true it shows `t('pwa.updateReady')` with a Refresh button (`updateServiceWorker(true)`) and a
  dismiss button. A short `pwa.offlineReady` info toast also appears once. It is mounted in `App.tsx` outside the
  screen switch, so it shows on every screen, including the table. It reuses the `.toast` styling and respects
  safe-area-inset-bottom.
- **`vercel.json`:** `Cache-Control: no-cache` for `/sw.js` and `/manifest.webmanifest`, so updates are found quickly.

## 2. Navigation
- `navStore.ts`: add `{ name: 'settings' }` and `{ name: 'stats' }` to `Screen`.
- `App.tsx`: add those cases.
- `Home.tsx`: turn on the Stats and Settings buttons and remove the "disabled until M5" comment.

## 3. Settings screen (`src/ui/screens/Settings.tsx` + `src/ui/styles/settings.css`)
The header has Back + title + LanguageToggle, the same as Rules. Every control writes through `updateSettings` and
saves immediately. Sections:
1. **Language:** සිං / EN segmented control.
2. **Play:** bot difficulty (segmented easy/medium/hard), speed (slow/normal/fast), one-tap play (switch),
   4-colour deck (switch with a live preview of 4 `<Card>`s, one per suit).
3. **House rules:** steppers (− value +) for targetScore (1–30), trumpTeamWinPoints, defenderWinPoints,
   kapothiPoints and tieBonus (0–10), a stackTieBonus switch, a note "applies to new games" (the engine copies
   settings into GameState at `createGame`), and "Restore defaults" for this section only.
4. **Practice aids:** highlightLegal, autoFeedback and allowUndo switches.
5. **Bot names:** three text inputs (seats 2/1/3, labelled partner/right/left), maxLength 16. An empty name falls
   back to the default name (check that `useSeatName` handles this).
6. **Lessons:** unlockAllLessons switch.
7. **Debug:** the seed and round number of the saved game (`loadSavedGame()`), or "no saved game". A numeric seed
   input + "Start game with seed" (`newGame({ seed, mode: 'real' })`). "Reset all saved data" with an inline confirm:
   it removes all four `omi.*.v1` keys and resets the settings, progress, stats and game stores. This needs small
   reset actions: `resetSettings()` in settingsStore, `reset()` in progressStore, `reset()` in statsStore and
   `clearSave()` in gameStore.

The switches are `<button role="switch" aria-checked>` and the segmented controls are radio groups. Every control has
a hit area of at least 44px. A pure helper `clampSetting(key, value)` in `src/store/mergeSettings.ts` holds the
stepper bounds, and it is unit tested.

## 4. Stats (SPEC §10.3)
- **`src/store/stats.ts` (pure, tested):** contains the `StatsData` type
  `{ v: 1, real: { byDifficulty: Record<BotDifficulty, { played, won }>, roundsPlayed, roundsWon, kapothiFor,
  kapothiAgainst, trumpCalls, trumpCallsWon }, practice: { gamesPlayed, hintsUsed, movesReviewed, movesGood } }`,
  plus `emptyStats()`, `parseStats(unknown)` (validates like `parseProgress`) and
  `applyStatsEvent(stats, event)`. The events are:
  `{ type: 'round', mode, result: RoundResult }`, `{ type: 'gameOver', mode, difficulty, won }`, `{ type: 'hint' }`
  and `{ type: 'review', verdict }`.
  - A trump call is a round where seat 0 (the player) chose trumps. It counts as a success when team 0 wins that
    round; a tie is not a success.
  - A game counts when it reaches GAME_OVER, so abandoned games are not counted.
- **`src/store/statsStore.ts`:** a Zustand store loaded from `omi.stats.v1`. It has `record(event)` (apply the event,
  then `saveJSON`) and `reset()`.
- **`gameStore.ts`:** add a `stats: { record(event) }` dependency, so tests can inject a fake.
  - In `dispatch`, when `roundHistory` grows, it records a `round` event, and on the move into GAME_OVER it records a
    `gameOver` event.
  - `requestHint` records `hint`.
  - In Practice, `playHumanCard` always runs `reviewMove` (even when autoFeedback is off) and records `review`.
  - The reducer ignores Real/Practice events that don't belong to the stats you chose.
- **`src/ui/screens/Stats.tsx` (+ CSS):**
  - Real section: a table per difficulty (played / won / win%), then tiles for rounds won/played, කැපෝති
    for/against, and trump-call success %.
  - Practice section: games, hints used, coach match %.
  - A ratio with a denominator of 0 shows "—". A friendly empty state appears when nothing has been played yet.
  - Numbers use `tabular-nums`.

## 5. Animation polish (SPEC §8.4)
- **Deal:** in `Hand.tsx` and `Seat.tsx`, stagger each card with a `--i` CSS variable (`animation-delay: calc(var(--i) *
  40ms)`), so the two blocks of 4 visibly fly in one after the other from the dealer's side.
- **Card to trick:** check that `play-in` starts from the player's seat (`--from-x/y`) and uses only transform and
  translate.
- **Trick collect:** check that `.trick--to-*` moves the cards toward the winner with transform and opacity only,
  that the length matches `COLLECT_MS`, and that there is a slight scale-down.
- **Score:** a short pop on a score token when points are awarded.
- **කැපෝති:** keep the burst, and add a gold shimmer on the result title.
- **Reduced motion:** check that `prefers-reduced-motion` turns all of this off (the global rule covers CSS). Also
  check that nothing animates `left/top/width`.

## 6. Accessibility pass
- Grep the CSS for interactive elements smaller than 44px (small home buttons, the language toggle, tracker toggle,
  coach dismiss, toast buttons, the new Settings controls) and fix them with `min-height/min-width: 44px` or a
  padded hit area.
- **Safe areas:** `#root` already pads all four insets. Check the elements outside that flow: the fixed toast, round
  modal, trump dialog, tracker sheet, game over screen and update toast. They must use `max(16px,
  env(safe-area-inset-*))`, which matters more now that the status bar is black-translucent.
- Check visible focus, `aria-label`s on the stepper and switch buttons, and `lang` on `<html>` (already done).

## 7. i18n
Add every new string to **both** `si.json` and `en.json`: `settings.*`, `stats.*`, `pwa.updateReady`
("අලුත් version එකක් තියෙනවා. Refresh කරන්න." / "A new version is available. Refresh."), `pwa.refresh` and
`pwa.offlineReady`. The existing `tests/content/i18n.test.ts` checks that both files have the same keys.

## 8. Docs
- SPEC §11: note the `prompt` update choice.
- SPEC §10.3: note how stats are split between Real and Practice.
- Copy this plan to `plans/M5-polish-pwa-deploy.md` (project convention).

## Verification
1. `npm test` covers the new unit tests:
   - `tests/store/stats.test.ts`: the reducer, parse/validation and trump-call rules.
   - `tests/store/gameStore.test.ts`: stats events are recorded through the fake dependency.
   - `clampSetting` tests.
   - The existing i18n parity test.
2. `npm run lint` and `npm run build` pass with no TS errors. Check that `dist/manifest.webmanifest`, `dist/sw.js`
   (precache includes the font woff2 files and icons) and `dist/apple-touch-icon-180x180.png` exist.
3. `npm run preview` and look at the app at 375×667 and 1366×768: Settings (each control saves and survives a reload,
   the 4-colour preview, Debug seed start, reset all data), Stats after a short Real and Practice game, reduced-motion
   emulation, and the update toast (rebuild while preview is open → toast → Refresh).
4. Offline: in DevTools → Application, check the service worker is active, turn on Offline, reload, and confirm the
   app and Sinhala font load.
5. Lighthouse (`npx lighthouse http://localhost:4173 --only-categories=performance,accessibility,best-practices,seo`,
   if Chrome is available) shows no major issues.
6. Commit on `feature/m5-polish-pwa-deploy`.

## Final deliverable: PowerShell deploy steps (given in the reply after implementation)
1. `git push -u origin feature/m5-polish-pwa-deploy`
2. `gh pr create --base develop`, then merge.
3. A PR from `develop` → `main`, then merge.
4. vercel.com → Add New → Project → import `Omi-Guru`. Framework Vite, build `npm run build`, output `dist`,
   production branch `main` → Deploy. Optionally use the Vercel CLI (`npm i -g vercel; vercel; vercel --prod`).
5. Install: iPhone Safari → Share → Add to Home Screen. Edge/Chrome → install icon in the address bar.
6. Airplane-mode test.
7. Releasing an update later: merge to main, then Vercel redeploys and the toast appears.
