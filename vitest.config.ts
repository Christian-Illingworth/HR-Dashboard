import { defineConfig } from 'vitest/config';

// `npm test` at the root runs every workspace's unit tests (tasks T007).
export default defineConfig({
  test: {
    projects: ['packages/*'],
  },
});
