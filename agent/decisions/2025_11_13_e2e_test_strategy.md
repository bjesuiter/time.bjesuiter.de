# Decision: E2E Test Strategy

**Date**: 2025-11-13\
**Status**: 📋 PLANNED

---

## Decision Summary

**DECISION: Use Playwright for E2E tests with per-test in-memory databases and
isolated server instances.**

Each test function spins up its own Bun server with an in-memory SQLite
database, ensuring complete test isolation. Tests interact exclusively via API
endpoints and browser automation - no direct database or server code imports.

---

## Test Architecture

### Three-Layer Testing Strategy

1. **Unit Tests** (Vitest - Node Mode)
   - Fast, isolated function/module tests
   - No browser, no database
   - Location: `tests/unit/**/*.{test,spec}.ts`

2. **Browser Component Tests** (Vitest - Browser Mode with Playwright)
   - Component integration tests in real browser
   - Uses Playwright provider via `@vitest/browser-playwright`
   - Location: `tests/browser/**/*.{test,spec}.ts`

3. **E2E Tests** (Playwright - Full User Journeys)
   - Complete user workflows
   - Real server + real browser + real database
   - Each test gets isolated server instance
   - Location: `tests/e2e/**/*.spec.ts`

---

## E2E Test Isolation Strategy

### Per-Test Server Instances

**Core Principle:** Maximum isolation through per-test server instances with
in-memory databases.

```typescript
// Each test function:
test("user can complete signup and login", async ({ page, serverUrl }) => {
  // serverUrl points to isolated server on unique port
  await page.goto(serverUrl);
  // ... test logic
});
// Server auto-destroyed after test
```

**Key Decisions:**

1. **In-Memory Database** (`DATABASE_URL=":memory:"`)
   - ✅ Fast (no disk I/O)
   - ✅ Auto-cleanup (destroyed with server)
   - ✅ No file management
   - ✅ Complete isolation

2. **Per-Test Server** (Not per-file, not shared)
   - Each test function gets own server
   - Unique random port per test
   - Cheap on Bun runtime
   - Zero state leakage between tests

3. **Shared Playwright Instance**
   - Single Playwright instance across all test files
   - Each test uses different browser tab
   - Different server port per test
   - Avoids Playwright startup overhead

4. **API-Only Interaction**
   - Tests NEVER import server code (db, auth, etc.)
   - All setup via API endpoints
   - Tests real authentication flows
   - No mocking of auth/database logic

---

## Database Schema Application

### Migration Strategy

**Development:**

```bash
bun run dbpush  # drizzle-kit push (manual schema sync)
```

**Production & Testing:**

```typescript
// src/db/index.ts
import { migrate } from "drizzle-orm/libsql/migrator";

if (envStore.ENVIRONMENT === "prod" || envStore.ENVIRONMENT === "test") {
  await migrate(db, { migrationsFolder: "./drizzle" });
}
```

**Test Flow:**

1. Set `ENVIRONMENT=test`
2. Set `DATABASE_URL=":memory:"`
3. Start Vite dev server with unique port and in-memory DB with bun process
   spawn
4. Server code imports `db` from `@/db/index` → migrations run automatically
5. Database ready with full schema

## Test Data Seeding

### API-First Seeding Strategy

**Core Principle:** Seed data via API endpoints, never directly in database.

```typescript
test("user can view weekly hours", async ({ page, serverUrl }) => {
  // 1. Create admin user via API
  await fetch(`${serverUrl}/registerAdmin`, {
    method: "POST",
    body: JSON.stringify({
      email: "admin@test.com",
      password: "test123",
      name: "Test Admin",
    }),
  });

  // 2. Login via browser (gets real cookies)
  await page.goto(`${serverUrl}/signin`);
  await page.fill('[name="email"]', "admin@test.com");
  await page.fill('[name="password"]', "test123");
  await page.click('button[type="submit"]');

  // 3. Setup Clockify via API
  await fetch(`${serverUrl}/api/clockify/setup`, {
    method: "POST",
    headers: { cookie: await page.context().cookies() },
    body: JSON.stringify({ apiKey: "...", workspaceId: "..." }),
  });

  // 4. Now test the actual feature
  await page.goto(`${serverUrl}/weekly`);
  // ... assertions
});
```

**Why API-First?**

- ✅ Tests real signup/login endpoints
- ✅ No code duplication (reuses production logic)
- ✅ Browser gets real cookies naturally
- ✅ Tests are black-box (no internal knowledge)

**Alternative Considered - Direct DB Seeding:**

```typescript
// ❌ NOT RECOMMENDED - Breaks isolation principle
import { db } from '@/db';
await db.insert(user).values({ ... });
```

- ❌ Couples tests to server internals
- ❌ Duplicates user creation logic
- ❌ Browser wouldn't have auth cookies
- ❌ Doesn't test real signup flow

---

## Port Management

### Random Free Port Allocation

**Requirements:**

1. Each test needs unique port
2. Ports must be actually free (not in use)
3. No port reuse within single Playwright session
4. Can reuse ports across Playwright restarts

**Implementation Strategy:**

```typescript
// tests/e2e/fixtures/portManager.ts
class PortManager {
  private usedPorts = new Set<number>();

  async getRandomFreePort(): Promise<number> {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const port = Math.floor(Math.random() * (65535 - 3001) + 3001);

      if (this.usedPorts.has(port)) continue;

      // Check if port is actually free
      if (await this.isPortFree(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error("Could not find free port after 10 attempts");
  }

  private async isPortFree(port: number): Promise<boolean> {
    // Try to bind to port, return true if successful
    // Implementation using net.createServer()
  }
}
```

**Why Random Ports?**

- ✅ Avoids conflicts with other services
- ✅ Allows parallel test execution
- ✅ No coordination needed between tests
- ❌ Sequential ports (3001, 3002...) could conflict with dev servers

---

## Playwright Test Fixtures

### Server Lifecycle Fixture

```typescript
// tests/e2e/fixtures/server.ts
import { test as base } from "@playwright/test";
import { ChildProcess, spawn } from "child_process";

type ServerFixtures = {
  serverUrl: string;
};

export const test = base.extend<ServerFixtures>({
  serverUrl: async ({}, use, testInfo) => {
    const portManager = new PortManager();
    const port = await portManager.getRandomFreePort();

    // Start Vite dev server with unique port and in-memory DB
    const server = spawn("bunx", ["vite", "dev", "--port", String(port)], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: ":memory:",
        ENVIRONMENT: "test",
        PORT: String(port),
        // Auth secrets for test
        BETTER_AUTH_SECRET: "test-secret-" + port,
        BETTER_AUTH_URL: `http://localhost:${port}`,
        VITE_SERVER_URL: `http://localhost:${port}`,
        // Allow user signup for tests
        ALLOW_USER_SIGNUP: "true",
      },
      stdio: "pipe",
    });

    // Wait for server to be ready
    const serverUrl = `http://localhost:${port}`;
    await waitForServerReady(serverUrl, { timeout: 30000 });

    console.log(`[${testInfo.title}] Server ready on ${serverUrl}`);

    // Provide server URL to test
    await use(serverUrl);

    // Cleanup: kill server
    server.kill("SIGTERM");

    // Wait for graceful shutdown
    await new Promise((resolve) => {
      server.on("exit", resolve);
      setTimeout(() => {
        server.kill("SIGKILL"); // Force kill if not exited after 5s
        resolve(null);
      }, 5000);
    });

    console.log(`[${testInfo.title}] Server stopped`);
  },
});

async function waitForServerReady(
  url: string,
  { timeout }: { timeout: number },
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) {
        // Server is responding (404 is fine, means server is up)
        return;
      }
    } catch (e) {
      // Server not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Server not ready after ${timeout}ms`);
}
```

### Database Fixture (Optional)

Since tests use API-only approach, we likely don't need direct database access.
However, for debugging or complex scenarios:

```typescript
// tests/e2e/fixtures/db.ts (optional)
import { test as base } from "./server";

type DbFixtures = {
  // No db fixture needed - tests use API only!
};

export const test = base; // Just re-export server fixture
```

---

## Test Structure

### Directory Layout

```
tests/
├── e2e/
│   ├── fixtures/
│   │   ├── server.ts           # Server lifecycle fixture
│   │   ├── portManager.ts      # Port allocation
│   │   └── test.ts             # Extended Playwright test
│   ├── user-journeys/
│   │   ├── onboarding.spec.ts  # First-time user setup
│   │   ├── auth.spec.ts        # Login/logout flows
│   │   ├── clockify-setup.spec.ts
│   │   └── weekly-view.spec.ts
│   └── playwright.config.ts    # Playwright configuration
├── browser/
│   └── components/             # Vitest browser component tests
│       └── Header.test.tsx
├── unit/
│   └── lib/                    # Vitest unit tests
│       └── utils.test.ts
└── vitest.config.ts            # Vitest configuration
```

### Example Test File

```typescript
// tests/e2e/user-journeys/onboarding.spec.ts
import { test } from "../fixtures/test";
import { expect } from "@playwright/test";

test.describe("User Onboarding", () => {
  test("new user can complete full setup flow", async ({ page, serverUrl }) => {
    // 1. Navigate to signup
    await page.goto(`${serverUrl}/signup`);

    // 2. Fill signup form
    await page.fill('[name="email"]', "newuser@test.com");
    await page.fill('[name="password"]', "SecurePass123!");
    await page.fill('[name="name"]', "New User");
    await page.click('button[type="submit"]');

    // 3. Should redirect to Clockify setup
    await expect(page).toHaveURL(`${serverUrl}/setup/clockify`);

    // 4. Enter Clockify credentials
    await page.fill('[name="apiKey"]', "test-clockify-key");
    await page.click('button:has-text("Connect Clockify")');

    // 5. Should redirect to tracked projects setup
    await expect(page).toHaveURL(`${serverUrl}/setup/tracked-projects`);

    // 6. Select projects
    await page.click('[data-project-id="proj-123"]');
    await page.click('button:has-text("Continue")');

    // 7. Should land on dashboard
    await expect(page).toHaveURL(`${serverUrl}/`);
    await expect(page.locator("h1")).toContainText("Welcome");
  });

  test("user cannot signup with invalid email", async ({ page, serverUrl }) => {
    await page.goto(`${serverUrl}/signup`);

    await page.fill('[name="email"]', "invalid-email");
    await page.fill('[name="password"]', "SecurePass123!");
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('[role="alert"]')).toContainText("Invalid email");
  });
});
```

---

## Playwright Configuration

### Config File

```typescript
// tests/e2e/playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./user-journeys",

  // Timeout per test
  timeout: 60 * 1000,

  // Fail fast on first failure (optional)
  maxFailures: 1,

  // Run tests in parallel (each gets own server)
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,

  // Retry on CI
  retries: process.env.CI ? 2 : 0,

  // Reporter
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    // Base URL not set - each test gets unique serverUrl
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Add more browsers as needed
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
  ],
});
```

---

## NPM Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run --config vitest.config.ts --project unit",
    "test:browser": "vitest run --config vitest.browser.config.ts --project browser",
    "test:e2e": "playwright test --config tests/e2e/playwright.config.ts",
    "test:e2e:ui": "playwright test --config tests/e2e/playwright.config.ts --ui",
    "test:e2e:debug": "playwright test --config tests/e2e/playwright.config.ts --debug",
    "test:all": "npm run test:unit && npm run test:browser && npm run test:e2e"
  }
}
```

---

## Key Design Principles

### ✅ DO:

- Each test function gets isolated server instance
- Use in-memory SQLite for speed and auto-cleanup
- Seed data via API endpoints only
- Use real authentication flows (no mocking)
- Use Playwright fixtures for server lifecycle
- Allocate random free ports per test
- Share single Playwright instance across tests
- Test complete user journeys end-to-end

### ❌ DON'T:

- Import server code (db, auth) in tests
- Share server instances between tests
- Use on-disk databases for E2E tests
- Mock authentication or database in E2E tests
- Seed data directly in database
- Use sequential ports (conflicts possible)
- Restart Playwright for each test
- Test implementation details

---

## Benefits of This Approach

### 1. Maximum Isolation

- Each test has clean database
- No state leakage between tests
- Tests can run in any order
- Parallel execution safe

### 2. Speed

- In-memory DB is fast
- Bun server startup is cheap
- Shared Playwright avoids overhead
- No file cleanup needed

### 3. Confidence

- Tests use real APIs
- Real authentication flows
- Real database migrations
- Same code path as production

### 4. Maintainability

- Tests are black-box
- No coupling to internals
- Easy to understand
- Self-documenting user flows

---

## Trade-offs & Considerations

### Server Startup Cost

**Concern:** Starting server per test might be slow.

**Mitigation:**

- Bun is very fast at startup
- In-memory DB avoids disk I/O
- Worth it for complete isolation
- Can group related tests in same file

### Port Exhaustion

**Concern:** Running out of available ports.

**Mitigation:**

- 65535 ports available
- Tests clean up quickly
- Random allocation spreads usage
- Unlikely to hit limits in practice

### Clockify API Mocking

**Concern:** Tests might need Clockify API responses.

**Future Work:**

- Consider MSW (Mock Service Worker) for API mocking
- Or use Clockify test workspace
- Or create fake Clockify API endpoints in test mode

---

## Next Steps

1. [ ] Install Playwright: `bun add -D @playwright/test`
2. [ ] Create `tests/e2e/fixtures/portManager.ts`
3. [ ] Create `tests/e2e/fixtures/server.ts` with fixture
4. [ ] Create `tests/e2e/playwright.config.ts`
5. [ ] Write first E2E test (user signup + login)
6. [ ] Add npm scripts for running E2E tests
7. [ ] Document running tests in README
8. [ ] Add to CI/CD pipeline

---

## References

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [Drizzle Migrations](https://orm.drizzle.team/docs/migrations)
- [Bun Runtime](https://bun.sh/)
- [Better-auth Testing](https://www.better-auth.com/docs/testing)

---

_Decision documented: 2025-11-13_
