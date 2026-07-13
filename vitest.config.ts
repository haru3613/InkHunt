import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // enabled (not just --coverage-gated) so CI's plain `vitest run` also
      // collects + enforces the thresholds below (HAR-666).
      enabled: true,
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/__tests__/**'],
      // Realistic floor at the measured baseline (HAR-666, 2026-07-13); ratchet
      // up as page/RLS/integration coverage grows. Below these, CI fails.
      thresholds: {
        lines: 75,
        statements: 74,
        functions: 60,
        branches: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
