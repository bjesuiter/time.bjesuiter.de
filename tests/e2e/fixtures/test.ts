/**
 * Extended Playwright test fixture
 * Re-exports the server fixture with all Playwright functionality
 *
 * This is the main test import for E2E tests
 *
 * @example
 * ```typescript
 * import { test, expect } from "../fixtures/test";
 *
 * test("my test", async ({ page, serverUrl }) => {
 *   await page.goto(serverUrl);
 *   // ... test logic
 * });
 * ```
 */

export { test, expect } from "./server";
