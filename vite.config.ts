/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Vitest globs the whole project by default, which swept up the Playwright specs in e2e/
    // and made a green unit run report a failed file. Playwright owns those; it has its own
    // runner and its own config.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
