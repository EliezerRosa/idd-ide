import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include:     ['src/__tests__/**/*.test.ts'],
    environment: 'node',
    globals:     true,
    alias: {
      'better-sqlite3': new URL(
        './src/__tests__/__mocks__/better-sqlite3.ts',
        import.meta.url
      ).pathname,
    },
    reporters: ['verbose'],
  },
});
