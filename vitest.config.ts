import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts', './tests/setup/integration-setup.ts'],
    testTimeout: 10000,
    include: [
      'src/**/*.test.{ts,tsx}',
      'app/**/*.test.{ts,tsx}',
      'lib/**/*.test.{ts,tsx}',
    ],
    exclude: [
      'tests/**', // Exclude integration/e2e tests from unit test runs
      'node_modules/**',
      'dist/**',
      '.next/**'
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});