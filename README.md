# Omi Guru (ඕමි ගුරු)

A web game that teaches **Omi (ඕමි)**, the Sri Lankan card game. It has a Learning mode, with lessons and practice alongside a coach, and a Real game mode against computer players. The UI is in Sinhala by default, and you can switch it to English.

It's a Progressive Web App (PWA) and runs entirely in the browser: no backend and no login.

- **iPhone:** open it in Safari → Share → **Add to Home Screen**. It opens full-screen and works offline.
- **Windows:** open it in Edge or Chrome and click **Install app**, or just use it in the browser.

> **Status:** milestone M0 (project setup) is done. You can see the build plan in [docs/MILESTONES.md](docs/MILESTONES.md).

## Features (planned)

| Mode      | Sinhala  | What it does                                                                           |
| --------- | -------- | -------------------------------------------------------------------------------------- |
| Lessons   | පාඩම්     | 8 guided lessons with scripted deals and quizzes                                       |
| Practice  | පුහුණුව     | A full game with hints, coach feedback, legal-card highlights, undo and a card tracker |
| Real game | සැබෑ ගේම | A full game with no help, three bot levels and stats                                   |

## Tech stack

TypeScript (strict) · React · Vite · Zustand · Vitest · ESLint · Prettier · vite-plugin-pwa · Noto Sans Sinhala (self-hosted via `@fontsource`)

## Getting started

You need Node.js 20.19 or later (or 22.12 or later). Run these in PowerShell:

```powershell
npm install
npm run dev
```

Then open http://localhost:5173.

## Scripts

| Command                | What it does                                         |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Starts the dev server                                |
| `npm run build`        | Type-checks, then builds for production into `dist/` |
| `npm run preview`      | Serves the production build                          |
| `npm test`             | Runs the unit, scenario and content tests            |
| `npm run test:watch`   | Runs the unit tests in watch mode                    |
| `npm run test:sim`     | Runs the long bot-vs-bot simulation tests            |
| `npm run lint`         | Runs ESLint                                          |
| `npm run format`       | Formats the code with Prettier                       |
| `npm run format:check` | Checks the formatting without changing any files     |

## Project structure

```
src/
  engine/    pure game rules: deck, RNG, legal cards, trick winner, scoring, state machine
  ai/        bots (Easy / Medium / Hard), card tracker, Monte Carlo
  coach/     hints, move review and reason codes
  content/   i18n (si.json, en.json, t.ts), lessons, rules text
  store/     Zustand stores
  storage/   localStorage wrapper (try/catch, versioned keys)
  ui/        screens, components, styles
tests/       engine, ai, coach, content, storage, sim
docs/        SPEC.md (what to build), MILESTONES.md (in what order)
plans/       implementation plans for each milestone
```

## Key rules for contributors

- `src/engine`, `src/ai` and `src/coach` are **pure TypeScript**: no React, no DOM, no Zustand, no `localStorage`, and no `Math.random()`. ESLint enforces this.
- Bots and the coach only see a `PlayerView`, never the full game state.
- Every string the user sees goes in both `src/content/i18n/si.json` and `en.json`, and is shown with `t()`.
- House rules such as scoring values are settings, not hard-coded numbers.

You can find the full guidelines in [CLAUDE.md](CLAUDE.md) and the specification in [docs/SPEC.md](docs/SPEC.md).
