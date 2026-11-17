import { defineConfig, devices } from '@playwright/test';

// :3000 allowed host · :4000 frame · :5100 the same host pages on a foreign origin
// (not :5000 — macOS AirPlay Receiver listens there)
const servers = [
  [3000, 'fixtures/host'],
  [4000, 'fixtures/frame'],
  [5100, 'fixtures/host'],
] as const;

export default defineConfig({
  testDir: 'tests',
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
  webServer: servers.map(([port, dir]) => ({
    command: `node serve.mjs ${port} ${dir}`,
    url: `http://localhost:${port}/framewire.global.js`,
    reuseExistingServer: !process.env.CI,
  })),
});
