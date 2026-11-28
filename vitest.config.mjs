import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  envDir: false,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 30000,
    setupFiles: ['./vitest.setup.mjs'],
    pool: 'forks',
    maxWorkers: 4,
    minWorkers: 1,
    exclude: [
      '**/node_modules/**',
      'OPEN PO/**',
      'bot-wa/**',
      'node_modules/**',
      '.next/**',
      '.npm-cache/**',
      '.worktrees/**',
      '.kilo/**',
      'scratch/**',
    ],
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx,mjs,cjs}'],
      exclude: ['node_modules/', '.next/', '**/*.test.{js,jsx,mjs,cjs}', 'vitest.config.mjs'],
    },
  },
});