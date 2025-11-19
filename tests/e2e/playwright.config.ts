import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// Get the repo root (2 levels up from config file)
const repoRoot = path.resolve(import.meta.dirname, "../..");

/**
 * Playwright configuration for E2E testing
 *
 * This config sets up:
 * - Per-test server instances with isolated databases
 * - Chromium browser testing
 * - Parallel test execution
 * - Proper reporting and debugging features
 */
export default defineConfig({
  testDir: "./user-journeys",

  // Timeout per test (60 seconds)
  timeout: 60 * 1000,

  // Give tests more time to start up (30 seconds)
  expect: {
    timeout: 30 * 1000,
  },

  // Fail fast on first failure (optional - set to 0 to continue on failure)
  maxFailures: 1,

  // Run tests in parallel (each gets own server instance)
  fullyParallel: true,

  // Number of parallel workers
  workers: process.env.CI ? 2 : 8,

  // Retry on CI (unstable network/flaky tests)
  retries: process.env.CI ? 2 : 0,

  // Reporter configuration
  reporter: [
    ["list"], // Console output
    [
      "html",
      {
        open: "never",
        outputFolder: path.join(repoRoot, "reports/html"),
      },
    ], // HTML report for CI
  ],

  // Global setup and teardown
  globalSetup: undefined, // We don't need global setup since each test spawns its own server

  use: {
    // Base URL not set - each test gets unique serverUrl from fixture
    trace: "on-first-retry", // Enable tracing on first retry
    screenshot: "only-on-failure", // Take screenshots on failure
    video: "retain-on-failure", // Record video on failure

    // Browser settings
    ignoreHTTPSErrors: true,
    userAgent: "playwright-test",
  },

  // Projects for different browsers
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Custom viewport for better testing
        viewport: { width: 1280, height: 720 },
        // Override user agent to identify test traffic
        userAgent: "playwright-test",
      },
    },
    // Add more browsers as needed
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Test files to ignore
  testIgnore: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.tanstack/**",
    "**/.vscode/**",
    "**/reports/**",
  ],

  // Output directory for test artifacts
  outputDir: path.join(repoRoot, "reports/artifacts"),

  // Web server (not used - we spawn our own servers per test)
  webServer: undefined,
});
