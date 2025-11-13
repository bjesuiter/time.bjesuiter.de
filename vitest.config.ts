import { defineConfig, mergeConfig } from "vitest/config";
import { baseConfig } from "./vite.base";

/**
 * Vitest configuration for unit tests
 * Extends base config and adds unit test specific settings
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
    ],
  },
});

export default mergeConfig(baseConfig, config);