# Omi Guru: Build Plan for Claude Code

Build in this order. Each milestone has a **goal**, **acceptance criteria**, and a **prompt** to paste into
Claude Code. Finish and commit one milestone before starting the next.

---

## How to use this with Claude Code (Windows / PowerShell)

1. Create an empty folder and put the planning files in it:
   ```
   omi-guru/
     CLAUDE.md
     docs/
       SPEC.md
       MILESTONES.md
   ```
2. Open PowerShell in that folder and run:
   ```powershell
   git init
   claude
   ```
   Claude Code reads `CLAUDE.md` automatically.
3. For each milestone:
   - Switch to **plan mode** (Shift+Tab) and paste the prompt. Review the plan, then approve it.
   - When it finishes, run `npm test` and `npm run dev`, and check it yourself.
   - Commit: `git add . ; git commit -m "M1: game engine"`
4. Start a fresh Claude Code session (`/clear`) for each milestone to keep the context clean.

---

## M0: Project setup

**Goal:** an empty app that runs, with tooling ready.

**Acceptance criteria**
- `npm run dev` shows a placeholder Home screen with the Sinhala font rendering correctly.
- `npm test`, `npm run build` and `npm run lint` all work.
- TypeScript strict mode is on. The folder structure matches SPEC §13 (empty files are fine).

**Prompt**
```
Read CLAUDE.md and docs/SPEC.md. Set up milestone M0 from docs/MILESTONES.md:
scaffold a Vite + React + TypeScript (strict) project in this folder, add Zustand, Vitest,
ESLint, Prettier, @fontsource/noto-sans-sinhala and vite-plugin-pwa (configured later in M5).
Add npm scripts: dev, build, preview, test, test:sim (a separate Vitest config/project for
tests/sim), lint. Create the folder structure from SPEC §13 and the i18n helper t() with
si.json / en.json containing only the Home screen strings. Show a placeholder Home screen
with the title "ඕමි ගුරු" and a සිං/EN toggle. Use PowerShell commands only.
```

---

## M1: Game engine + tests

**Goal:** the complete, correct Omi rules as pure TypeScript.

**Acceptance criteria**
- Everything in SPEC §2 and §3 is implemented in `src/engine/`.
- All unit tests from SPEC §12 ("Unit") pass.
- No React or DOM imports in `src/engine/`. A seeded RNG makes deals reproducible.
- `createRoundFromPreset` works (needed later for lessons).

**Prompt**
```
Implement milestone M1 from docs/MILESTONES.md: the game engine in src/engine/ exactly as
described in docs/SPEC.md §2 (rules) and §3 (domain model and engine API). Follow the
seat model in CLAUDE.md carefully (anticlockwise, next(seat) = (seat+1)%4, trump chooser
= next(dealer), who leads first). Use the reference scoring function in SPEC §2.5.
Write all the unit tests listed in SPEC §12 "Unit" under tests/engine/. Don't build any UI yet.
Run npm test and fix everything until it passes.
```

---

## M2: Playable table (Real game, Easy bots)

**Goal:** play a full game to 10 points on phone and PC.

**Acceptance criteria**
- The Game table screen follows SPEC §8.2 in portrait, plus the landscape layout.
- SVG cards (SPEC §8.3), the trump choice dialog, the round result modal and the game over screen.
- An Easy bot (random legal card), with delays from the speed setting.
- Illegal-tap behaviour for Real mode from SPEC §2.6.
- The UI drives the engine only through `applyAction`, via a Zustand store.
- Every string comes from i18n (si + en).
- Auto-save after each trick, with Continue on the Home screen.

**Prompt**
```
Implement milestone M2 from docs/MILESTONES.md. Build the Game table (SPEC §8.2, §8.3, §8.4,
§8.6), the trump choice dialog, the round result modal and the game over screen. Add the
Easy bot (SPEC §4.3) in src/ai/ using the Bot interface from SPEC §4, which receives only a
PlayerView. Create src/store/gameStore.ts that holds GameState and calls the engine's
applyAction; bot turns run with delays from the speed setting (SPEC §4.6). Implement Real-game
illegal-tap handling (SPEC §2.6) and auto-save/continue (SPEC §7, §10.2). Mobile-first:
test at 375x667 portrait and 1366x768 landscape. All text goes through t() with si and en.
```

---

## M3: Smart bots + coach

**Goal:** bots that play like real players, and a coach that explains moves in Sinhala.

**Acceptance criteria**
- The card tracker, trump chooser and Medium + Hard bots are implemented (SPEC §4.1–§4.5).
- The coach engine is implemented: `getHint`, `getTrumpHint`, `reviewMove` and equivalent cards (SPEC §5).
- All reason and mistake texts from SPEC §5.2–§5.5 are in si.json and en.json.
- The scenario tests and the simulation tests from SPEC §12 pass, including the strength checks.
- Difficulty can be selected before a Real game.

**Prompt**
```
Implement milestone M3 from docs/MILESTONES.md. In src/ai/ build cardTracker, trumpChooser,
the heuristic bot (Medium/Hard, SPEC §4.4, returning reason codes) and the Hard bot's Monte
Carlo check (SPEC §4.5, 150 ms budget). In src/coach/ build getHint, getTrumpHint, reviewMove
and card equivalence (SPEC §5). The coach must use the heuristic policy, not Monte Carlo, and
only the human's PlayerView. Add all reason/mistake/verdict texts (SPEC §5.2–5.5) to si.json
and en.json. Write the AI/coach scenario tests and the simulation tests from SPEC §12
(tests/ai, tests/coach, tests/sim). Add a difficulty picker before Real games. Run npm test and
npm run test:sim until everything passes, and report the bot win rates.
```

---

## M4: Learning mode (Practice + 8 Lessons)

**Goal:** the full learning experience.

**Acceptance criteria**
- Practice mode with every aid from SPEC §6.1: highlights, hint, auto-feedback, card tracker, bot explanations,
  undo, show all cards, and the trump hint in the trump dialog.
- A lesson engine with the data model from SPEC §6.2, plus a Lesson list and Lesson player.
- All 8 lessons authored (SPEC §6.2 table), each with steps, a preset where needed, and 3 quiz questions.
- Lesson progress is saved, with ✓ marks and unlock order.
- Content tests pass: lesson presets valid, scripted plays legal, i18n keys complete.
- The Rules reference screen (Sinhala + English) with the glossary from SPEC §9.2.

**Prompt**
```
Implement milestone M4 from docs/MILESTONES.md. First build Practice mode with every aid in
SPEC §6.1 (the coach UI uses the M3 coach engine). Then build the lesson engine (SPEC §6.2
types), the Lesson list and the Lesson player, and author all 8 lessons in
src/content/lessons/ following the SPEC §6.2 table: simple, friendly Sinhala using the
glossary terms in SPEC §9.2 (English words where Sri Lankans normally use them), with an
English version too. Each lesson needs explain steps, interactive steps and 3 quiz questions
with explanations. Save progress (SPEC §10.2). Add the Rules reference screen with the full
rules and glossary. Add the content tests from SPEC §12 "Content". Show me the Sinhala text of
lesson 1 and lesson 5 when done so I can review the wording.
```

---

## M5: Polish, PWA and deploy

**Goal:** installable, offline, polished, and live on Vercel.

**Acceptance criteria**
- PWA configured as in SPEC §11. Installs on iPhone (Add to Home Screen) and Windows, and works in airplane mode.
- Settings screen (all of SPEC §10.1), Stats screen (SPEC §10.3), and the update toast.
- Animations polished, `prefers-reduced-motion` respected, 4-colour deck option.
- A Lighthouse PWA/performance check with no major issues.
- Deployed on Vercel.

**Prompt**
```
Implement milestone M5 from docs/MILESTONES.md. Configure vite-plugin-pwa as in SPEC §11
(precache everything including the Sinhala font, an original SVG logo → icons 192/512 maskable
and a 180 apple-touch-icon, iOS meta tags, update toast). Build the Settings screen (all of
SPEC §10.1) and the Stats screen (SPEC §10.3). Polish the animations (SPEC §8.4) and add the
4-colour deck option. Check accessibility: 44px tap targets and safe-area insets. Then give
me step-by-step PowerShell instructions to push to GitHub and deploy on Vercel.
```

---

## Deploying and installing (after M5)

1. Push the repo to GitHub.
2. On vercel.com: **Add New → Project →** import the repo. Framework: **Vite**, build command `npm run build`,
   output folder `dist`. Deploy.
3. **iPhone:** open the Vercel URL in **Safari** → Share → **Add to Home Screen**.
4. **Windows:** open the URL in Edge or Chrome → click the **Install** icon in the address bar.
5. Test offline: open the app once, turn on airplane mode, and open it again.

---

## Tips for working with Claude Code

- Always review the plan in plan mode before approving it, especially for M1 (rules) and M3 (AI).
- If a rule looks wrong while you play, ask Claude Code to **write a failing test first** that reproduces it, then fix it.
- Use a seed to reproduce bugs: show the game seed in Settings → "Debug", and share it with Claude Code.
- Review the Sinhala wording yourself after M4. You're the best judge of natural Sinhala.
