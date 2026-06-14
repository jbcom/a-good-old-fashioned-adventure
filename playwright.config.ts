import { defineConfig, devices } from "@playwright/test";

/**
 * Deployed-build E2E: serves the built `dist/` under the GitHub Pages project
 * SUBPATH and drives the real artifact with a headless browser. This is the
 * gate the dev-server vitest browser tests can't be — it tests the shipped
 * bundle with production-shaped asset paths (`base: "./"`) and asset-load
 * timing, the exact conditions that hid the live black-ground bug.
 *
 * Requires `pnpm build` first (CI runs build before this). A tiny static file
 * server (tests/e2e/serve.mjs) maps /a-good-old-fashioned-adventure/* → dist/*.
 */
const SUBPATH = "/a-good-old-fashioned-adventure";
const PORT = 8911;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 90_000,
  use: {
    baseURL: `http://localhost:${PORT}${SUBPATH}/`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node tests/e2e/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}${SUBPATH}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
