import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.js'],
    globals: true,
    restoreMocks: true,
    mockReset: true,
    clearMocks: true,
  },
});

