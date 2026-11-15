import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3001',
    headless: true,
  },
  webServer: {
    command: 'npm start',
    port: 3001,
    timeout: 15_000,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'api', testMatch: '*-api.spec.ts' },
    { name: 'e2e', testMatch: '*.spec.ts', testIgnore: '*-api.spec.ts' },
  ],
});
