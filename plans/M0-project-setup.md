# M0: Project setup for Omi Guru

## Context
The repo only holds `CLAUDE.md` and `docs/` (SPEC.md, MILESTONES.md). There are no commits on `master` yet.
M0 should give us an app that runs, with all the tooling in place. M1 to M5 build on top of it.
**Acceptance (MILESTONES M0):**
- `npm run dev` shows a placeholder Home screen, and the Sinhala font renders correctly.
- `npm test`, `npm run build` and `npm run lint` all work.
- TypeScript strict mode is on, and the folders match SPEC §13. Empty files are fine.

Environment: Node 24.15 and npm 11.12, on Windows with PowerShell. Git `core.autocrlf=true`.

## Approach: write the scaffold by hand (no `npm create vite`)
`create-vite` in a folder that already has files either prompts us or, with `--overwrite`, **deletes
`docs/` and `CLAUDE.md`**. So I write the scaffold files myself, based on the official `react-ts`
template. Then `npm install` resolves the real versions.

### Version choices (checked against the npm registry on 2026-11-17)
- vite 8.3, @vitejs/plugin-react 6.3, react/react-dom 19.3, vitest 5.1
- eslint 10.15, typescript-eslint 8.73, prettier 3.10, zustand 5.1, vite-plugin-pwa 2.0
- @fontsource/noto-sans-sinhala 5.3
- **typescript pinned to `~6.0.3`, not 7.0.2.** The latest typescript-eslint has the peer range
  `typescript >=4.8.4 <6.1.0`, so TS 7 would break `npm run lint`.

### 1. Root config files
- `package.json`: `"type": "module"`, `"private": true`, plus these scripts:
  - `dev`: `vite`
  - `build`: `tsc -b && vite build` (npm runs scripts through cmd.exe, which supports `&&`)
  - `preview`: `vite preview`
  - `test`: `vitest run --project unit`
  - `test:watch`: `vitest --project unit`
  - `test:sim`: `vitest run --project sim`
  - `lint`: `eslint .`
  - `format`: `prettier --write .`
  - `format:check`: `prettier --check .`
- Install with PowerShell:
  - `npm install react react-dom zustand @fontsource/noto-sans-sinhala`
  - `npm install -D vite @vitejs/plugin-react typescript@~6.0.3 @types/react @types/react-dom @types/node@^24 vitest eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals prettier eslint-config-prettier vite-plugin-pwa`
- `tsconfig.json` holds only references to `tsconfig.app.json` and `tsconfig.node.json`.
  - `tsconfig.app.json` covers `src` and `tests`. It sets `strict: true`, `noUnusedLocals`,
    `noUnusedParameters`, `noFallthroughCasesInSwitch` and `noUncheckedSideEffectImports`.
  - It also sets `erasableSyntaxOnly`, `verbatimModuleSyntax`, `moduleDetection: "force"` (so the empty
    stub files compile), `moduleResolution: "bundler"`, `resolveJsonModule`, `jsx: "react-jsx"`,
    `noEmit` and `types: ["vite/client"]`. TS 6 defaults `types` to `[]`, so `types` must be set.
  - `tsconfig.node.json` covers `vite.config.ts` and `vitest.config.ts`, with `types: ["node"]`.
- `vite.config.ts` uses only `react()`. A comment notes that vite-plugin-pwa is installed but is
  configured in M5.
- `vitest.config.ts` runs `mergeConfig(viteConfig, …)` with `test.projects`. Both projects use
  `environment: 'node'`.
  - `unit` includes `tests/**/*.test.{ts,tsx}` and `src/**/*.test.{ts,tsx}`. It excludes
    `...configDefaults.exclude` plus `tests/sim/**`.
  - `sim` includes `tests/sim/**/*.test.ts`, with a long `testTimeout` and `passWithNoTests: true`. M0
    has no simulation tests yet. Remove the flag in M3.
- `eslint.config.js` (flat config) is built with `defineConfig` / `globalIgnores(['dist','dev-dist','coverage'])`:
  - For `**/*.{ts,tsx}`: `js.configs.recommended`, `tseslint.configs.recommended` (includes `no-explicit-any`),
    the react-hooks flat recommended config, `reactRefresh.configs.vite` and `globals.browser`.
  - **Architecture guard** for `src/engine/**`, `src/ai/**` and `src/coach/**`, which enforces CLAUDE.md
    rules 1 and 2:
    - `no-restricted-imports` blocks `react`, `react-dom`, `zustand` and anything under `src/ui`,
      `src/store` or `src/storage`.
    - `no-restricted-globals` blocks `window`, `document` and `localStorage`.
    - `no-restricted-properties` blocks `Math.random`.
  - `eslint-config-prettier/flat` comes last.
  - I'll check the exact names of the plugin config keys against the installed versions.
- `.prettierrc.json`: `singleQuote`, `trailingComma: "all"`, `printWidth: 100`, `endOfLine: "lf"`.
- `.prettierignore`: `dist`, `dev-dist`, `coverage`, `package-lock.json`, `docs/`, `plans/`, `CLAUDE.md`.
  This keeps Prettier from reformatting your planning docs.
- `.gitattributes`: `* text=auto eol=lf`. Your `autocrlf=true` would otherwise check files out as CRLF,
  and `prettier --check` would then fail.
- `.gitignore`: `node_modules`, `dist`, `dev-dist`, `coverage`, `*.local`, `*.tsbuildinfo` and logs.
- `index.html`:
  - `<html lang="si">`
  - viewport `width=device-width, initial-scale=1, viewport-fit=cover`
  - `<title>` from SPEC §11
  - `#root` and `/src/main.tsx`
  - The other PWA/iOS meta tags and the icons wait for M5. No Vite branding.

### 2. Folder structure (SPEC §13)
Each stub file holds one comment line saying what it will contain and in which milestone, e.g.
`// getLegalCards, getTrickWinner (M1). See SPEC §3.1.`
- `src/engine/`: types, cards, deck, rng, rules, scoring, stateMachine, view (`.ts`)
- `src/ai/`: bot, easyBot, heuristicBot, hardBot, trumpChooser, cardTracker, monteCarlo (`.ts`)
- `src/coach/`: hintEngine, review, reasons, equivalence (`.ts`)
- `src/content/`:
  - `i18n/si.json`, `i18n/en.json` and `i18n/t.ts`
  - `lessons/.gitkeep`
  - `rules/si.md`, `rules/en.md` (empty)
- `src/store/`: gameStore, progressStore (stubs), plus **settingsStore.ts** (real code, see §3)
- `src/storage/persist.ts` (real code)
- `src/ui/screens/`: **Home.tsx** (real code) plus `.tsx` stubs for LessonList, LessonPlayer, GameTable,
  Rules, Stats, Settings and GameOver
- `src/ui/components/`: **LanguageToggle.tsx** (real code) plus stubs for Card, CardBack, Hand,
  TrickArea, Seat, ScoreBar, TrumpBadge, CoachBubble, HintButton, CardTracker, TrumpDialog,
  RoundResult and Toast
- `src/ui/styles/`: `global.css` and `home.css`
- `src/ui/useT.ts`
- `src/App.tsx` and `src/main.tsx`
- `tests/engine`, `tests/ai`, `tests/coach` and `tests/sim` each get a `.gitkeep`. `tests/content`
  holds the i18n test.

### 3. Real code in M0
- **`src/content/i18n/t.ts`** (pure, no React):
  - Exports `Language = 'si' | 'en'`, `MessageKey = keyof typeof si` and
    `TParams = Record<string, string | number>`.
  - `translate(lang, key, params?)` replaces each `{name}` with its param. An unknown placeholder is left
    as it is. If a key is missing in `en`, it falls back to `si`.
  - The dictionaries are typed `Record<Language, Record<MessageKey, string>>`. **The compiler then fails
    if `en.json` is missing a key that `si.json` has.**
- **`src/ui/useT.ts`**: `useT()` reads `language` from the settings store and returns a memoized
  `t(key, params?)`. Components call `const t = useT();`, and the text changes as soon as the language
  changes.
- **`src/storage/persist.ts`**: `loadJSON<T>(key, fallback)` and `saveJSON(key, value)`. Every
  `localStorage` access is wrapped in try/catch (CLAUDE.md rule 7).
- **`src/store/settingsStore.ts`** (Zustand): holds `language` (default `'si'`) and `setLanguage`. It
  loads from and saves to `omi.settings.v1` through `persist.ts`. SPEC §9.1 says the language choice is
  saved, so it survives a reload. Later milestones extend this store to the full `GameSettings`, merged
  with defaults.
- **Home strings** use flat dotted keys, in both files:

  | Key | si | en |
  |---|---|---|
  | `app.title` | ඕමි ගුරු | Omi Guru |
  | `home.continue` | ඉදිරියට යන්න | Continue |
  | `home.learn` | ඉගෙන ගන්න | Learn |
  | `home.realGame` | සැබෑ ගේම | Real game |
  | `home.rules` | නීති | Rules |
  | `home.stats` | ප්‍රගතිය | Progress |
  | `home.settings` | සැකසුම් | Settings |
  | `language.si` | සිං | සිං |
  | `language.en` | EN | EN |
  | `language.label` | භාෂාව | Language |

- **`Home.tsx`** shows:
  - the title
  - a centred column of menu buttons (Learn, Real game, Rules, Progress, Settings), shown but
    `disabled` until their screens exist
  - Continue, which is hidden for now because there's no saved game until M2
  - the `LanguageToggle` in the top corner
- **`LanguageToggle.tsx`**: a segmented control `සිං | EN`. It is a `role="group"` labelled by
  `language.label`, and each button has `aria-pressed` and a tap target of at least 44px.
- **`App.tsx`** renders `<Home/>`. A `useEffect` keeps `document.documentElement.lang` in sync with the
  language.
- **`main.tsx`** imports the font CSS, then `global.css`, then renders `<StrictMode><App/></StrictMode>`.
- **Font:** import `@fontsource/noto-sans-sinhala/sinhala-400.css` and `sinhala-700.css`.
  - These are the Sinhala-subset files. Their `unicode-range` covers only Sinhala, so Latin text falls
    through to the system font, as SPEC §9.1 asks.
  - CSS stack: `'Noto Sans Sinhala', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`.
  - If those subset files don't exist in 5.3, fall back to `400.css` and `700.css`.
- **`global.css`**:
  - `:root` colour tokens (table green)
  - body `line-height: 1.6`
  - `touch-action: manipulation`
  - `env(safe-area-inset-*)` padding
  - a `prefers-reduced-motion` reset
  - mobile-first layout that also works at 1366×768

### 4. Tests (`npm test`)
- `tests/content/i18n.test.ts`:
  - `si.json` and `en.json` have the same keys (SPEC §12 "Content"), and no value is empty.
  - Each key uses the same `{placeholder}` names in both languages.
  - `translate` interpolates params, keeps unknown placeholders, and returns the right text for each
    language.
- `tests/storage/persist.test.ts`: uses `vi.stubGlobal('localStorage', …)` to check two things.
  - Saved values round-trip.
  - `loadJSON` returns the fallback, and `saveJSON` doesn't throw, when `localStorage` throws (the iOS
    Safari case).

## Verification
1. `npm test`: the i18n and persist tests pass.
2. `npm run test:sim` exits 0. There are no simulation tests yet.
3. `npm run lint` is clean. Then check the architecture guard without creating any file:
   `"import React from 'react'; Math.random();" | npx eslint --stdin --stdin-filename src/engine/x.ts`
   should report two errors.
4. `npm run format`, then `npm run format:check` is clean.
5. `npm run build`: `tsc -b` gives no errors, and `dist/` contains the Noto Sans Sinhala `.woff2`.
6. Start `npm run dev` in the background and confirm it serves the page. Use the `run` skill to look at
   it at 375×667 and 1366×768 if a browser is available. Otherwise you check it by eye. Check that:
   - ඕමි ගුරු renders in Noto Sans Sinhala
   - සිං/EN switches every string at once
   - the language choice survives a reload
7. I won't commit. You commit, as MILESTONES says:
   `git add . ; git commit -m "M0: project setup"`

## Implementation notes (where the build differs from the plan)
- **Font:** the package's `sinhala-*.css` files have no `unicode-range`. So the Sinhala font also
  supplied the space character, and English looked gappy ("Omi  Guru"). `src/ui/styles/fonts.css` now
  declares the two `@font-face` rules itself:
  - They use the Sinhala `unicode-range`, including ZWJ/ZWNJ.
  - They point at `@fontsource/noto-sans-sinhala/files/*.woff2`.
  - Latin letters, digits and spaces come from the system font. Only the woff2 files are shipped.
- **`passWithNoTests`** has no effect inside a Vitest project config. It is now the
  `--passWithNoTests` flag in the `test:sim` script. Remove it in M3.
- **`loadJSON(key): unknown`** returns `undefined` when the key is missing, the JSON is invalid or
  storage fails, instead of `loadJSON<T>(key, fallback)`. The caller validates the value, which avoids an
  unchecked `as T`. `saveJSON` returns `boolean`.
- **`interpolate(template, params)`** is exported from `t.ts` alongside `translate`, so placeholder
  handling can be tested before any string with placeholders exists.
- The toggle styles live in `src/ui/styles/language-toggle.css`.
- `vitest.config.ts` imports `./vite.config.ts` with the extension, which silences Vite's
  native-config-loader warning.
- `npm audit`: 4 moderate findings, all in dev-only tooling (vite-plugin-pwa → workbox-build → glob →
  minimatch). The production dependencies have 0. Recheck in M5 when the PWA plugin is configured.
