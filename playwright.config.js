const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 5000 },
  use: {
    baseURL: 'http://127.0.0.1:8080',
    headless: true,
    viewport: { width: 1280, height: 1000 },
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'npm run build && npx http-server dist -p 8080',
    port: 8080,
    reuseExistingServer: false,
    timeout: 60000,
  },
});
