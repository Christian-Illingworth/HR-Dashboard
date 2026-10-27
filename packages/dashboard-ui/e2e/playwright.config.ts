import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const packageDir = fileURLToPath(new URL('..', import.meta.url));
const phone = { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true };

// End-to-end and accessibility checks against the mock-data harness (quickstart Q5, Q6).
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: '../../../test-results',
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../../../playwright-report' }]],
  fullyParallel: true,
  // The mock data is calculated in the browser; under six parallel workers that can take longer
  // than the default 5 s.
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'npx vite --config vite.harness.config.ts',
    cwd: packageDir,
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop-chromium', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
    { name: 'phone-chromium', use: { browserName: 'chromium', ...phone } },
    { name: 'phone-webkit', use: { browserName: 'webkit', ...phone } },
  ],
});
