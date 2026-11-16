import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
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
      'dokumentasi_arsitektur/**',
    ],
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{js,jsx,mjs,cjs,ts,tsx}'],
      exclude: [
        'node_modules/',
        '.next/',
        '**/*.test.{js,jsx,mjs,cjs,ts,tsx}',
        '**/*.spec.{js,jsx,mjs,cjs,ts,tsx}',
        'vitest.config.mjs',
        'vitest.setup.mjs',
        'src/app/**/*.tsx', // Page components - tested via integration
        'src/components/**/*.tsx', // UI components - tested via integration
      ],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50,
      },
    },
    // TypeScript support
    typecheck: {
      tsconfig: './tsconfig.json',
    },
  },
});