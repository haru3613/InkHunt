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
      // Ratcheted after unit coverage phase 2 (admin/quote-requests/portfolio UI).
      // Measured ~89.9% lines / ~84.7% branches / ~80% functions; floor leaves headroom.
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 75,
        branches: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
