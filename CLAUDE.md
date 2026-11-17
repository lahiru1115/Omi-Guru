# Omi Guru (ඕමි ගුරු)

A web game (PWA) that teaches the Sri Lankan card game **Omi (ඕමි)**. It has a **Learning mode**
(lessons + practice with a coach) and a **Real game mode**. The UI is **Sinhala by default**, mixed with
common English words, and has an English toggle. It runs on iPhone (Safari / Home Screen) and Windows
(Edge / Chrome).

- Full specification: `docs/SPEC.md` (the source of truth; read it before changing behaviour)
- Build plan and acceptance criteria: `docs/MILESTONES.md`

## Tech stack

- TypeScript (strict), React, Vite
- Zustand for app state
- Vitest for tests
- vite-plugin-pwa for offline/installable support
- `@fontsource/noto-sans-sinhala` (self-hosted font, works offline)
- No backend and no login. Everything runs in the browser. Persistence uses `localStorage`.

## Commands

```powershell
npm install        # install dependencies
npm run dev        # start dev server
npm test           # run all tests (Vitest)
npm run test:sim   # run the long bot-vs-bot simulation tests
npm run build      # production build (dist/)
npm run preview    # preview the production build
npm run lint       # ESLint
npm run generate-pwa-assets  # regenerate PWA icons from public/logo.svg (PNGs are committed)
```

The developer works on **Windows with PowerShell**. Give commands in PowerShell syntax. Don't use bash-only syntax.

## Architecture rules (must follow)

1. **The game engine is pure TypeScript.** `src/engine/`, `src/ai/` and `src/coach/` must not import React,
   the DOM, Zustand or `localStorage`. They are pure functions over plain data.
2. **The engine is immutable and deterministic.** `applyAction(state, action)` returns a new state. All randomness
   comes from the seeded RNG in `src/engine/rng.ts`. Never call `Math.random()` in engine, ai or coach code.
3. **No cheating.** Bots and the coach receive a `PlayerView` from `getPlayerView(state, seat)`, never the full
   `GameState`. They must not see other players' hidden cards.
4. **One source of truth for rules.** The UI, bots, coach and lessons all use the engine's `getLegalCards`,
   `getTrickWinner` and `scoreRound`. Don't re-implement rules in the UI.
5. **No hard-coded user-facing text.** Every string the user sees comes from `src/content/i18n/si.json` and
   `en.json` via the `t()` helper. Sinhala (`si`) is the default language.
6. **House rules are settings.** Scoring numbers, the tie bonus and similar values come from `GameSettings`, never
   from literals.
7. Wrap all `localStorage` access in `try/catch` (iOS Safari can throw). Version the keys (`omi.*.v1`).

## Seat model (important; easy to get wrong)

Play goes **anticlockwise**. Seats are numbered in play order:

| Seat | Position on screen | Who |
|---|---|---|
| 0 | bottom | You (ඔයා) |
| 1 | right | Opponent |
| 2 | top | Your partner |
| 3 | left | Opponent |

- `next(seat) = (seat + 1) % 4`. The player "to the dealer's right" is `next(dealer)`.
- `team(seat) = seat % 2`. Team 0 = You + Partner ("අපි"), Team 1 = opponents ("ඔවුන්").
- The trump chooser is `next(dealer)`, and they lead the first trick.

## Code style

- TypeScript `strict: true`. No `any`. Prefer `type` unions and discriminated unions for actions and steps.
- Small, focused modules. Name files after what they export.
- Card ids are strings like `"AS"`, `"10H"`, `"7C"` (rank + suit letter).
- Mobile-first CSS. Respect `env(safe-area-inset-*)` and `prefers-reduced-motion`.

## Definition of done (for any change)

- `npm test` passes and `npm run build` succeeds with no TypeScript errors.
- Engine, ai and coach changes include unit tests.
- New user-facing text exists in **both** `si.json` and `en.json`.
- Works in a 375×667 portrait viewport (iPhone) and a 1366×768 landscape viewport (PC).
