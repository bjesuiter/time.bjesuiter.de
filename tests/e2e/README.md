# E2E Testing

This directory contains end-to-end tests using Playwright with per-test server isolation.

## Architecture

Each test gets:
- **Isolated Server**: Own Bun server instance on random port
- **In-Memory Database**: Fresh SQLite database per test
- **Real Authentication**: Better-auth flows with real cookies
- **API-First Testing**: No direct server code imports

## Running Tests

```bash
# Run all E2E tests
bun run e2e

# Or use the full command
bun run test:e2e

# Run with UI mode (interactive)
bun run test:e2e:ui

# Run in debug mode
bun run test:e2e:debug

# Run all test layers
bun run test:all
```

## Test Structure

```
tests/e2e/
├── fixtures/
│   ├── portManager.ts    # Random free port allocation
│   ├── server.ts         # Server lifecycle fixture
│   └── test.ts           # Extended Playwright test
├── user-journeys/
│   └── *.spec.ts         # E2E test files
└── playwright.config.ts   # Playwright configuration
```

## Writing Tests

```typescript
import { test, expect } from "../fixtures/test";

test("my test", async ({ page, serverUrl }) => {
  // Navigate to isolated server
  await page.goto(serverUrl);
  
  // Test your application
  await expect(page.locator("h1")).toContainText("Welcome");
});
```

## Key Features

- **Per-Test Isolation**: Each test gets clean database and server
- **Random Ports**: No conflicts between parallel tests
- **Auto-Cleanup**: Servers and databases destroyed after each test
- **Real Environment**: Uses same code path as production
- **Fast Execution**: In-memory DB + Bun startup speed

## Debugging

- Screenshots taken on failure
- Video recordings of failed tests
- HTML reports with detailed information
- Server output logged for debugging

View the latest HTML report:
```bash
npx playwright show-report
```