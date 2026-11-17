import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// vite-plugin-pwa is installed, but it is configured in milestone M5 (SPEC §11).
export default defineConfig({
  plugins: [react()],
});
