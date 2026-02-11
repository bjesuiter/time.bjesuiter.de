# Decision: Test Strategy Update - Bun Test Runner Integration

**Date**: 2025-11-19\
**Status**: ✅ IMPLEMENTED\
**Updates**: [Decision: E2E Test Strategy](2025_11_13_e2e_test_strategy.md)

---

## Decision Summary

**DECISION: Replace Vitest with Bun's native test runner for unit and integration tests, while keeping Playwright for E2E tests.**

We've simplified our testing stack by:

1. Using **Bun Test Runner** for unit tests (with mocked HTTP responses)
2. Using **Bun Test Runner** for integration tests (with real Clockify API calls)
3. Keeping **Playwright** for E2E tests (full-stack user journeys)

This eliminates Vitest as a dependency and leverages Bun's built-in testing capabilities.

---

## Updated Three-Layer Testing Strategy

### 1. Unit Tests (Bun Test Runner)

**Purpose**: Fast, isolated function/module tests with mocked HTTP responses

**Key Characteristics:**

- Native Bun test runner - zero additional dependencies
- Built-in mocking via `mock()` module
- Tests business logic, utilities, and error handling
- Location: `tests/unit/**/*.test.ts`
- Run: `bun test tests/unit`

**Focus Areas:**

- Business logic and data transformations
- Utility functions and helpers
- Error handling scenarios with mocked HTTP responses
- Request payload formatting
- Pure functions without external dependencies

**Example:**

```typescript
// tests/unit/clockify-client.test.ts
import { test, expect, mock } from "bun:test";
import { getWorkspaces } from "@/lib/clockify/client";

test("getWorkspaces formats response correctly", async () => {
  const mockFetch = mock(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{ id: "w1", name: "Workspace 1" }]),
    }),
  );

  global.fetch = mockFetch;

  const result = await getWorkspaces("test-key");

  expect(result).toEqual([{ id: "w1", name: "Workspace 1" }]);
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
```

### 2. Integration Tests (Bun Test Runner with Real APIs)

**Purpose**: Validate integration with real external APIs (Clockify)

**Key Characteristics:**

- Uses actual API keys from environment variables
- Tests against real Clockify API endpoints
- Validates core API integration works correctly
- Location: `tests/integration/**/*.test.ts`
- Run: `bun test tests/integration`

**Focus Areas:**

- Clockify API client functions with real API calls
- API key validation
- Workspace, client, and project fetching
- Summary and detailed report generation
- Real error responses from Clockify API

**Required Environment Variables:**

- `CLOCKIFY_TEST_API_KEY` - Valid Clockify API key for testing
- `CLOCKIFY_TEST_WORKSPACE_ID` - Workspace ID to test against

**Example:**

```typescript
// tests/integration/clockify-api.test.ts
import { test, expect } from "bun:test";
import { getWorkspaces } from "@/lib/clockify/client";

test("getWorkspaces returns real workspaces", async () => {
  const apiKey = process.env.CLOCKIFY_TEST_API_KEY;
  if (!apiKey) {
    throw new Error("CLOCKIFY_TEST_API_KEY not set");
  }

  const workspaces = await getWorkspaces(apiKey);

  expect(workspaces).toBeArray();
  expect(workspaces.length).toBeGreaterThan(0);
  expect(workspaces[0]).toHaveProperty("id");
  expect(workspaces[0]).toHaveProperty("name");
});
```

### 3. E2E Tests (Playwright - Full User Journeys)

**Purpose**: Complete user workflows with real server + browser + database

**No changes from original E2E strategy:**

- Each test function gets isolated server instance with in-memory DB
- Tests full stack including UI, server functions, and database
- API-first testing approach (no direct server code imports)
- Location: `tests/e2e/**/*.spec.ts`
- Run: `bun run test:e2e`

See [Decision: E2E Test Strategy](2025_11_13_e2e_test_strategy.md) for full details.

---

## What Changed from Original Strategy

### Removed: Vitest for Unit and Browser Tests

**Original Strategy:**

- Unit Tests: Vitest (Node Mode)
- Browser Component Tests: Vitest (Browser Mode with Playwright)
- E2E Tests: Playwright

**Updated Strategy:**

- Unit Tests: **Bun Test Runner** (with mocked HTTP)
- Integration Tests: **Bun Test Runner** (with real APIs)
- E2E Tests: Playwright (unchanged)

### Why Drop Vitest?

**Problems with Vitest:**

1. Additional dependency (vitest + @vitest/browser-playwright)
2. Configuration overhead (separate vitest.config.ts files)
3. Duplicated test runner when Bun has built-in testing
4. Browser mode unclear value for this project (React components tested in E2E)

**Benefits of Bun Test Runner:**

1. ✅ **Zero config** - Built into Bun runtime
2. ✅ **Ultra-fast** - Native performance
3. ✅ **Native mocking** - `mock()` module included
4. ✅ **Simpler stack** - One less tool to learn
5. ✅ **Better DX** - Consistent with Bun ecosystem

### New Layer: Integration Tests

**Why Add Integration Tests?**

The original strategy had a gap:

- Unit tests mock everything → Don't validate real API behavior
- E2E tests test full stack → Slow, complex to debug API issues

Integration tests fill this gap:

- Test against **real Clockify API**
- Catch API changes early
- Validate request/response formats
- Faster than E2E (no browser/UI)
- More confidence than mocked unit tests

**Use Cases:**

- Ensure Clockify API client works with real API
- Validate API authentication
- Test edge cases (rate limits, malformed responses)
- Smoke test after Clockify API updates

---

## NPM Scripts (Updated)

```json
{
  "test:unit": "bun test tests/unit",
  "testw:unit": "bun test --watch tests/unit",
  "test:integration": "bun test tests/integration",
  "testw:integration": "bun test --watch tests/integration",
  "test:e2e": "bunx playwright test --config tests/e2e/playwright.config.ts",
  "test:e2e:ui": "bunx playwright test --config tests/e2e/playwright.config.ts --ui",
  "test:e2e:debug": "bunx playwright test --config tests/e2e/playwright.config.ts --debug",
  "test:all": "bun test tests/unit && bun test tests/integration && bun run test:e2e",
  "e2e": "bun run test:e2e",
  "e2e:report": "bunx playwright show-report reports/html"
}
```

**Script Naming Pattern:**

- `test:*` - Run tests once in normal mode
- `testw:*` - Run tests in watch mode (continuous)

**Key Changes:**

- `test:unit` now uses `bun test` instead of `vitest`
- Watch mode uses `testw:unit` instead of `test:unit:watch`
- Added `test:integration` and `testw:integration` for real API tests
- Removed `test:browser` (browser testing done in E2E)
- `test:all` now runs unit → integration → E2E

---

## File Structure (Updated)

```
tests/
├── unit/                       # Bun test - Mocked HTTP
│   ├── clockify-client.test.ts
│   ├── utils.test.ts
│   └── README.md
│
├── integration/                # Bun test - Real APIs
│   ├── clockify-api.test.ts
│   └── README.md
│
├── e2e/                        # Playwright - Full stack
│   ├── fixtures/
│   │   ├── portManager.ts
│   │   ├── server.ts
│   │   └── test.ts
│   ├── user-journeys/
│   │   ├── auth.spec.ts
│   │   ├── dashboard.spec.ts
│   │   └── ...
│   ├── playwright.config.ts
│   └── README.md
│
└── (removed vitest.config.ts files)
```

---

## Key Benefits of Updated Strategy

### 1. Simpler Stack

- Only **Bun + Playwright** (no Vitest)
- Fewer configuration files
- Less to learn and maintain

### 2. Three-Layer Confidence

```
Unit Tests (mocked)
    ↓ Fast feedback on logic
Integration Tests (real APIs)
    ↓ Validate external dependencies
E2E Tests (full stack)
    ✅ Confidence in complete user flows
```

### 3. Maximum Isolation

- Unit: No external dependencies
- Integration: Real API, no UI/DB
- E2E: Isolated server per test

### 4. Fast Execution

- Bun's native test runner is extremely fast
- Built-in mocking avoids setup overhead
- Integration tests skip UI rendering
- E2E tests use in-memory DB

### 5. Real API Validation

- Integration tests catch Clockify API changes
- Ensures our client code works with actual API
- More confidence than mocked tests alone

---

## Testing Guidelines

### When to Write Each Type of Test

**Unit Tests (Bun):**

- ✅ Pure functions
- ✅ Business logic
- ✅ Data transformations
- ✅ Utility functions
- ✅ Error handling paths
- ❌ Components (use E2E instead)
- ❌ Database queries (use E2E instead)

**Integration Tests (Bun):**

- ✅ Clockify API client functions
- ✅ External API integrations
- ✅ API authentication flows
- ✅ Request/response formatting
- ❌ UI interactions (use E2E instead)
- ❌ Database operations (use E2E instead)

**E2E Tests (Playwright):**

- ✅ Complete user journeys
- ✅ Authentication flows (signup, login)
- ✅ Multi-step workflows
- ✅ UI interactions
- ✅ Database + API + UI together
- ❌ Testing individual functions (use unit tests)
- ❌ Testing API clients in isolation (use integration tests)

### For AI Agents: Test Generation Rules

**IMPORTANT:** Don't generate tests randomly!

1. **Only generate tests when explicitly asked**
   - User: "Write tests for the clockify client" ✅
   - User: "Add a new feature" → DON'T auto-generate tests ❌

2. **Match the requested test type**
   - If user asks for "unit tests" → Use Bun Test Runner
   - If user asks for "integration tests" → Use Bun Test Runner with real APIs
   - If user asks for "E2E tests" → Use Playwright

3. **Focus on what was asked**
   - Don't generate tests for unrelated code
   - Don't generate all three test types unless asked
   - One test file per request is usually enough

---

## Migration Path (Completed)

### ✅ Phase 1: Remove Vitest Dependencies

- [x] Remove `vitest` from package.json
- [x] Remove `@vitest/browser-playwright` from package.json
- [x] Delete `vitest.config.ts`
- [x] Delete `vitest.browser.config.ts`
- [x] Delete `tests/browser/` directory (if it existed)

### ✅ Phase 2: Update Existing Unit Tests

- [x] Migrate existing unit tests from Vitest to Bun Test Runner
- [x] Update imports: `import { test, expect } from "bun:test"`
- [x] Update mocking syntax to use Bun's `mock()` module
- [x] Add `tests/unit/README.md` with guidelines

### ✅ Phase 3: Add Integration Test Layer

- [x] Create `tests/integration/` directory
- [x] Add example Clockify API integration test
- [x] Document required environment variables
- [x] Add `tests/integration/README.md`

### ✅ Phase 4: Update Documentation

- [x] Update `ARCHITECTURE.md` with new test strategy
- [x] Update npm scripts in `package.json`
- [x] Create this decision document
- [x] Update main README with test commands

---

## Trade-offs & Considerations

### Bun Test Runner Limitations

**Maturity:**

- Bun's test runner is newer than Vitest
- Smaller ecosystem and community
- May have fewer features

**Mitigation:**

- Bun test runner is stable for our use case
- We only need basic testing features (mocking, assertions)
- Can revisit if we hit limitations

### Integration Test Costs

**API Rate Limits:**

- Real API calls count against Clockify rate limits
- Could hit limits during development

**Mitigation:**

- Run integration tests less frequently (not on every save)
- Use `bun test tests/unit` for rapid iteration
- Only run `bun test tests/integration` before commits

**API Key Management:**

- Need valid Clockify test credentials
- Must be careful not to commit API keys

**Mitigation:**

- Use environment variables (`.env.test.local`)
- Document setup clearly in `tests/integration/README.md`
- Add `.env.test.local` to `.gitignore`

---

## Success Metrics

### Test Coverage Goals

- Unit tests: 80%+ coverage of business logic
- Integration tests: Cover all Clockify API endpoints we use
- E2E tests: Cover all critical user journeys

### Test Performance Targets

- Unit tests: < 5 seconds for entire suite
- Integration tests: < 30 seconds for entire suite
- E2E tests: < 5 minutes for entire suite
- Total test time: < 6 minutes

### Maintenance Burden

- Minimal configuration (Bun handles most setup)
- Clear separation between test types
- Easy to identify which tests to run during development

---

## Related Decisions

- [Decision: E2E Test Strategy](2025_11_13_e2e_test_strategy.md) - Original E2E strategy (still valid for Playwright tests)

---

## References

- [Bun Test Runner Documentation](https://bun.sh/docs/cli/test)
- [Bun Mocking Guide](https://bun.sh/docs/test/mocking)
- [Playwright Documentation](https://playwright.dev/)
- [Clockify API Documentation](https://clockify.me/developers-api)

---

_Decision documented: 2025-11-19_
_Updates original E2E test strategy from 2025-11-13_
