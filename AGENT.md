# Agent Guidelines

This document contains guidelines for AI agents working on this codebase.

---

## Agent Communication Rules

### Be Concise by Default

**Keep all responses brief and focused. The user will ask for more details if
needed.**

**General Conversation:**

- Give direct, concise answers
- Avoid unnecessary explanations or elaboration
- Don't show code examples unless specifically requested
- Trust the user to ask follow-up questions

**After Completing Tasks:**

- Summarize in one sentence: "Created 3 decision documents and updated
  ARCHITECTURE.md."
- Don't list every file change or explain each decision unprompted
- Don't show code snippets unless relevant and requested

**Examples:**

✅ **Good** (Concise):

> "Added authentication check to the API endpoint."

❌ **Bad** (Too verbose):

> "I've added an authentication check to the API endpoint. This is important
> because we need to ensure that only authenticated users can access this
> resource. I used the Better-auth session validation pattern, which checks the
> session headers and returns a 401 error if the user is not authenticated.
> Here's the code I added: [long code block]..."

**When to be detailed:**

- User explicitly asks "how?", "why?", or "show me"
- Explaining complex architectural decisions (but still be structured and clear)
- User asks for clarification or more information

---

### Agent Documentation

- **Decisions**: `agent/decisions/YYYY_MM_DD_topic.md`
- **Summaries**: `agent/summaries/` (implementation notes, test strategies)
- **Temporary files**: `agent/tmp/` (not committed)
- Keep `agent/ARCHITECTURE.md` high-level; details go in decision files

---

### Documentation Search

Use `context7` tools: resolve library ID first, then fetch docs.

---

## Project-Specific Guidelines

### Development Workflow

**Common Commands:**

- `bun run dev` - Dev server (port 3000)
- `bun run build` / `bun run serve` - Build and preview
- `bun test <filename>` - Run specific unit or integration test file via bun
  (fuzzy matches in `tests/`)
- `bun test:unit` - Run all unit tests
- `bun test:integration` - Run all integration tests
- `bun e2e` - E2E tests (Playwright)
- `bun e2e <filename>` - One specific E2E test file (fuzzy matches in
  `tests/e2e/user-journeys/`)
- `bun run dbpush` / `bun run dbstudio` - Database tools
- `bunx prettier --write <filepath>` - Format code
- Check port 3000 or 3001 before starting dev server

---

---

## Tech Stack Overview

### Core Technologies

- **Runtime**: Bun (fast JavaScript runtime)
- **Framework**: TanStack Start (full-stack React framework with file-based
  routing)
- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: SQLite with Drizzle ORM
- **Authentication**: Better-auth (email authentication)
- **Data Fetching**: TanStack Query
- **Testing**: Vitest (use vitest for all testing, no other test libraries)
- **E2E Testing**: Playwright with per-test server isolation

---

## Database (SQLite + Drizzle)

**Better-auth tables** (DO NOT modify): `user`, `session`, `account`,
`verification`

**Custom tables:**

- Reference `user.id` as foreign key
- Use snake_case naming
- Define in `src/db/schema/` (one file per domain)

**Custom types:** `src/db/types/` (customIsoDate, customUint8Array)

---

## Authentication (Better-auth)

**Server-side:** Check `auth.api.getSession()` in server functions

**Client-side:** Use `authClient` from `src/client/auth-client.ts`

**Route protection:** Check auth in `beforeLoad`, redirect to `/signin` if
needed

**Notes:**

- Auto password hashing, HTTP-only cookies
- Auth config: `src/lib/auth/auth.ts` (auto-discovered)
- API route: `src/routes/api/auth/$.ts`

---

## E2E Testing

- **Run tests**: `bun e2e <filename>` (fuzzy matches in
  `tests/e2e/user-journeys/`)
- **Architecture**: Per-test server isolation with in-memory SQLite database
- See `tests/e2e/README.md` for detailed documentation

---

## Code Organization

**Key directories:**

- `src/server/` - ⭐ Server functions (safe for envStore, db, auth imports)
- `src/routes/` - File-based routes (never import server-only modules here)
- `src/db/schema/` - Database schemas (separate by domain)
- `src/components/` - React components
- `src/lib/` - Shared utilities
- `src/client/` - Client-side utilities

**Naming:** PascalCase (components), camelCase (utilities), snake_case (DB
tables)

---

## TanStack Router

**File-based routing:** `src/routes/` (auto-generates `routeTree.gen.ts`)

**Server functions:** Use `createServerFn` in `src/server/` files

**Loaders vs Server Functions:**

- Loaders: Initial page data, pre-navigation fetch, runs on client and server
- Server functions: Mutations, user interaction data, runs directly on server,
  REST call from client to server

**Route protection:** Check auth in `beforeLoad` hook

---

## Environment Variables

**Validated with Zod in `src/lib/env/envStore.ts`:**

- `DATABASE_URL`, `ALLOW_USER_SIGNUP`, `ADMIN_EMAIL`, `ADMIN_LABEL`,
  `ADMIN_PASSWORD`

**Adding new variables:** Update envStore schema, tell user to add to `.env`
file, document here

### ⚠️ Critical: Server-Only Access

**The `envStore` module should ONLY be imported in server-only files.**

#### ✅ Correct Pattern: Server Functions in `src/server/`

Create server functions in `src/server/` and import server-only modules at the
top level:

```typescript
// src/server/myServerFns.ts
import { createServerFn } from "@tanstack/react-start";
import { envStore } from "@/lib/env/envStore"; // ✅ Safe - server-only file
import { db } from "@/db"; // ✅ Safe - server-only file
import { auth } from "@/lib/auth/auth"; // ✅ Safe - server-only file

export const myServerFunction = createServerFn({ method: "POST" })
  .inputValidator((data: MyType) => data)
  .handler(async ({ data }) => {
    // Access envStore, db, auth directly
    if (!envStore.SOME_SETTING) {
      throw new Error("Setting disabled");
    }

    const result = await db.query.myTable.findFirst();
    return result;
  });
```

Then import and use in route files:

```typescript
// src/routes/myroute.tsx
import { createFileRoute } from "@tanstack/react-router";
import { myServerFunction } from "@/server/myServerFns"; // ✅ Safe - imports server function only

export const Route = createFileRoute("/myroute")({
  loader: async () => {
    return await myServerFunction({
      data: {
        /* ... */
      },
    });
  },
  component: MyComponent,
});
```

#### ❌ Incorrect Pattern: Direct Imports in Route Files

```typescript
// ❌ DON'T DO THIS
import { createFileRoute } from "@tanstack/react-router";
import { envStore } from "@/lib/env/envStore"; // ❌ Will run on client!
import { db } from "@/db"; // ❌ Will run on client!

export const Route = createFileRoute("/myroute")({
  loader: async () => {
    // Even though this runs server-side, the imports above
    // are evaluated when the module loads on the client!
    return { data: envStore.SOME_VALUE };
  },
});
```

#### Why This Matters

TanStack Start uses code splitting and bundles route files for both client and
server. When you import a module at the top level:

1. The import runs when the module loads
2. Route modules load on BOTH client and server
3. Server-only modules (envStore, db, auth) fail in the browser
4. Result: Runtime errors about undefined `process.env`

By isolating server-only imports to `src/server/` files, we ensure they never
get bundled for the client.

### Server-Only Modules List

These modules should ONLY be imported in `src/server/` files:

- `@/lib/env/envStore` - Environment variables
- `@/db` - Database instance
- `@/lib/auth/auth` - Auth instance (for `auth.api.*` calls)
- `@/db/schema/*` - Database schemas
- `drizzle-orm` - ORM utilities (eq, and, or, etc.)
- `better-sqlite3` - SQLite driver
- Node.js built-ins (fs, path, crypto, etc.)

### Client-Safe Modules

These can be imported anywhere (client or server):

- `@/client/auth-client` - Better-auth client
- `@tanstack/react-router` - Router utilities
- `@tanstack/react-start` - Server function utilities
- `react` - React library
- `lucide-react` - Icons
- UI components

---
