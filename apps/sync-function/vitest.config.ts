import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'sync-function',
    include: ['test/unit/**/*.test.ts', 'test/http/**/*.test.ts', 'test/contract/**/*.test.ts'],
    environment: 'node',
  },
});
