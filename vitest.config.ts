import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          // `npm test`: fast unit, scenario and content tests.
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
            exclude: [...configDefaults.exclude, 'tests/sim/**'],
          },
        },
        {
          // `npm run test:sim`: long bot-vs-bot simulations (SPEC §12).
          // The script passes --passWithNoTests until the first sim tests land in M3.
          extends: true,
          test: {
            name: 'sim',
            environment: 'node',
            include: ['tests/sim/**/*.test.ts'],
            testTimeout: 10 * 60 * 1000,
          },
        },
      ],
    },
  }),
);
