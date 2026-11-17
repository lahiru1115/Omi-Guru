import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates the PWA icons (192/512, maskable 512) and the 180×180 apple-touch-icon from the original
// SVG logo (SPEC §11). Run `npm run generate-pwa-assets` after changing public/logo.svg; the PNGs are committed.
const felt = '#0b5d3b';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0.1, resizeOptions: { background: felt } },
    apple: { ...minimal2023Preset.apple, padding: 0.05, resizeOptions: { background: felt } },
  },
  images: ['public/logo.svg'],
});
