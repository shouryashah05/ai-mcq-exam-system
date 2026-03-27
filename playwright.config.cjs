const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node e2e/start-ai-service.cjs',
      url: 'http://127.0.0.1:5001/health',
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: 'node e2e/start-backend.cjs',
      url: 'http://127.0.0.1:5100/api/health',
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: 'node e2e/start-frontend.cjs',
      url: 'http://127.0.0.1:4173/login',
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});