import { defineConfig, mergeConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { baseConfig } from "./vite.base";

/**
 * Vitest browser configuration for integration tests
 * Extends base config and adds browser testing with Playwright
 */
const config = defineConfig({
  test: {
    projects: [
      {
        test: {
          // Unit tests (node environment)
          include: [
            "tests/unit/**/*.{test,spec}.ts",
            "tests/**/*.unit.{test,spec}.ts",
          ],
          name: "unit",
          environment: "node",
        },
      },
      {
        test: {
          // Browser integration tests (Playwright)
          include: [
            "tests/browser/**/*.{test,spec}.ts",
            "tests/**/*.browser.{test,spec}.ts",
          ],
          name: "browser",
          browser: {
            enabled: true,
            // https://vitest.dev/guide/browser/playwright
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});

export default mergeConfig(baseConfig, config);
