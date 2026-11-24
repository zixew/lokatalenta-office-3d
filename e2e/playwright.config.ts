import fs from 'node:fs';
import { defineConfig } from '@playwright/test';
import { CHROME_FALLBACK_PATH, URLS, WEBGL_LAUNCH_ARGS } from './helpers/env.ts';

function resolveChromeExecutable(): string | undefined {
  const envPath = process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }
  if (fs.existsSync(CHROME_FALLBACK_PATH)) {
    return CHROME_FALLBACK_PATH;
  }
  return undefined;
}

const executablePath = resolveChromeExecutable();

export default defineConfig({
  testDir: './specs',
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: URLS.office,
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: [...WEBGL_LAUNCH_ARGS],
    },
  },
});
