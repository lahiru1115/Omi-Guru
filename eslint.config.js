import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// CLAUDE.md architecture rules 1 and 2: engine, ai and coach are pure, deterministic TypeScript.
const PURE_CODE = ['src/engine/**/*.ts', 'src/ai/**/*.ts', 'src/coach/**/*.ts'];
const PURE_IMPORT_MESSAGE =
  'src/engine, src/ai and src/coach must stay pure TypeScript: no React, DOM, Zustand or storage.';
const PURE_GLOBAL_MESSAGE =
  'src/engine, src/ai and src/coach must not touch the DOM or localStorage. Pass plain data in.';

export default defineConfig([
  globalIgnores(['dist', 'dev-dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    files: PURE_CODE,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: PURE_IMPORT_MESSAGE },
            { name: 'react-dom', message: PURE_IMPORT_MESSAGE },
            { name: 'zustand', message: PURE_IMPORT_MESSAGE },
          ],
          patterns: [
            { group: ['react/*', 'react-dom/*', 'zustand/*'], message: PURE_IMPORT_MESSAGE },
            { group: ['**/ui/**', '**/store/**', '**/storage/**'], message: PURE_IMPORT_MESSAGE },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: PURE_GLOBAL_MESSAGE },
        { name: 'document', message: PURE_GLOBAL_MESSAGE },
        { name: 'localStorage', message: PURE_GLOBAL_MESSAGE },
        { name: 'sessionStorage', message: PURE_GLOBAL_MESSAGE },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded RNG in src/engine/rng.ts.' },
        { object: 'globalThis', property: 'localStorage', message: PURE_GLOBAL_MESSAGE },
        { object: 'window', property: 'localStorage', message: PURE_GLOBAL_MESSAGE },
      ],
    },
  },
  prettier,
]);
