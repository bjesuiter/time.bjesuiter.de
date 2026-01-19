# Agent Guidelines

Guidelines for AI agents working on this codebase.

---

## Commands

```bash
# Development
bun run dev                    # Dev server (port 3000)
bun run dev2                   # Dev server (port 3001, memory mode)
bun run build && bun run serve # Build and preview

# Testing - Single file (RECOMMENDED)
bun test <filename>            # Fuzzy match in tests/ (unit/integration)
bun e2e <filename>             # Fuzzy match in tests/e2e/user-journeys/

# Testing - All
bun test:unit                  # All unit tests
bun test:integration           # All integration tests  
bun run e2e                    # All E2E tests (Playwright)
bun run test:all               # Run all test layers

# E2E extras
bun run test:e2e:ui            # Interactive Playwright UI
bun run test:e2e:debug         # Debug mode
bun run e2e:report             # View HTML report

# Database
bun run dbpush                 # Push schema to DB
bun run dbstudio               # Open Drizzle Studio
bun run dbgenerate             # Generate migrations

# Formatting
bunx prettier --write <filepath>

# Other
bun run auth-schema            # Regenerate better-auth schema
```

**Before starting dev server**: Check if port 3000/3001 is in use.

---

## Tech Stack

- **Runtime**: Bun
- **Framework**: TanStack Start (file-based routing)
- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: SQLite + Drizzle ORM
- **Auth**: Better-auth (email)
- **Data Fetching**: TanStack Query
- **Testing**: Bun test (unit/integration), Playwright (E2E)

---

## Code Style

### Imports

Order imports consistently:
1. External packages (`react`, `@tanstack/*`, etc.)
2. Internal aliases (`@/server/*`, `@/lib/*`, `@/components/*`)
3. Relative imports

```typescript
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { myServerFn } from "@/server/myServerFns";
import { authClient } from "@/client/auth-client";
import { MyComponent } from "@/components/MyComponent";
```

### Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserMenu.tsx`, `function UserMenu()` |
| Utilities/hooks | camelCase | `useAuth.ts`, `formatDate.ts` |
| Server functions | camelCase | `getUserData`, `checkClockifySetup` |
| DB tables | snake_case | `user_clockify_config` |
| DB columns | snake_case | `clockify_api_key` |
| Test files | `*.test.ts` | `validateApiKey.test.ts` |
| E2E test files | `*.spec.ts` | `auth.spec.ts` |

### TypeScript

- **Strict mode enabled** - no `as any`, `@ts-ignore`, `@ts-expect-error`
- Prefer explicit types for function parameters
- Use Zod for runtime validation (see `src/lib/env/envStore.ts`)

### Error Handling

```typescript
// Server functions: throw Response for HTTP errors
if (!envStore.ADMIN_EMAIL) {
  throw new Response("Admin not configured", { status: 500 });
}

// Or return structured errors
return { success: false, error: "Error message" };
```

### Testing

- Use `bun:test` for unit/integration: `import { expect, test } from "bun:test"`
- Use Playwright fixtures for E2E: `import { test, expect } from "../fixtures/test"`
- Test names: `testName-001: description of what it tests`
- **Browser testing**: Use the `playwrighter_exec` skill, if possible. Note, that this skill may have multiple tabs under its control from different projects, so take exceptional care that you use the right tab! (aka. right port and the main page heading is what you expect)
- Fallback: Use the `agent-browser` skill
- DO NOT use `playwright-mcp`, it's very token heavy

---

## Architecture

### Directory Structure

```
src/
├── server/       # Server functions (safe for db, envStore, auth)
├── routes/       # File-based routes (NEVER import server-only modules)
├── components/   # React components
├── client/       # Client-side utilities (auth-client)
├── db/
│   ├── schema/   # Drizzle schemas (one file per domain)
│   └── types/    # Custom DB types
└── lib/
    ├── auth/     # Auth configuration
    └── env/      # Environment variables (envStore)
```

### Server-Only Modules (CRITICAL)

These modules must ONLY be imported in `src/server/` files:

- `@/lib/env/envStore` - Environment variables
- `@/db` - Database instance
- `@/lib/auth/auth` - Auth instance
- `@/db/schema/*` - Database schemas
- `drizzle-orm` - ORM utilities

**Why**: Route files are bundled for both client and server. Server-only imports in routes cause runtime errors in browser.

### Correct Pattern

```typescript
// src/server/myServerFns.ts
import { createServerFn } from "@tanstack/react-start";
import { envStore } from "@/lib/env/envStore"; // OK - server file
import { db } from "@/db";                       // OK - server file

export const getData = createServerFn({ method: "GET" }).handler(async () => {
  return await db.query.myTable.findFirst();
});

// src/routes/myroute.tsx  
import { getData } from "@/server/myServerFns"; // OK - imports function only
// import { db } from "@/db";                   // WRONG - will fail in browser
```

### Client-Safe Modules

Can be imported anywhere:
- `@/client/auth-client`
- `@tanstack/react-router`, `@tanstack/react-start`
- `react`, `lucide-react`
- UI components

---

## Database

### Better-auth Tables (DO NOT modify)

`user`, `session`, `account`, `verification`

### Custom Tables

- Reference `user.id` as foreign key
- Use snake_case for tables and columns
- Define in `src/db/schema/` (one file per domain)

---

## Authentication

**Server-side**: `auth.api.getSession()` in server functions  
**Client-side**: `authClient` from `@/client/auth-client`  
**Route protection**: Check auth in `beforeLoad` hook

---

## Environment Variables

Validated with Zod in `src/lib/env/envStore.ts`:
- `DATABASE_URL`, `ALLOW_USER_SIGNUP`, `ADMIN_EMAIL`, `ADMIN_LABEL`, `ADMIN_PASSWORD`

To add new variables: Update envStore schema, add to `.env`, document here.

---

## Agent Workspace

The `agent/` folder is for LLM workspace:
- **Decisions**: `agent/decisions/YYYY_MM_DD_topic.md`
- **Summaries**: `agent/summaries/`
- **Temporary**: `agent/tmp/` (not committed)

Use `context7` tools for documentation lookups: resolve library ID first, then fetch docs.

---

## Communication

Be concise. One-sentence summaries after tasks. No code examples unless requested.

## Work on next ticket 
If the user tells you to "work on the next ticket" or "next step" or "next phase", get the most important ticket from your perspective from beans and work on it. Work ONLY on one ticket at the same time.
If you realize you need to do another thing, create a new ticket for this. 
When you finish a ticket successfully, mark the ticket as done in beans and Commit and Push afterwards. 
Use ultrawork.

## Default Ralp-Loop Prompt 
Get the most important ticket from your perspective from beans and work on it. Work ONLY on one ticket at the same time.
If you realize you need to do another thing, create a new ticket for this. 
When you finish a ticket successfully, mark the ticket as done in beans and Commit and Push afterwards. 
You're done when all tickets are implemented or if the user stops you explicitely.
Use ultrawork.

## Integration Testing Ralph-Loop 
Look at the served website at http://localhost:3001 via agent-browser. 
Test every ticket in beans, which is marked as done and validate it as a user would. 
If the test works, add this result to the ticket and mark it as "ai verified".
If it does not, create a new ticket in beans as a bug for later inspection, 
mark the ticket as "broken" and store the followup inspection ticket as a link, then go on to test the next ticket.
You're done if every ticket which is currently marked as done is marked as "ai verified" or "broken".
Use ultrawork.
