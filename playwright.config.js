const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    viewport: { width: 1280, height: 1000 },
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'npx http-server -p 8080',
    port: 8080,
    reuseExistingServer: true,
    timeout: 10000,
  },
});
