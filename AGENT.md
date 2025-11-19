# Agent Guidelines

This document contains guidelines for AI agents working on this codebase.

---

## Communication Guidelines

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

## Development Workflow

### Use Package.json Scripts

Always use the predefined scripts from `package.json` rather than custom
commands:

- `bun run dev` - Start development server on port 3000
- `bun run build` - Build for production
- `bun run serve` - Preview production build
- `bun run test` - Run tests with vitest
- `bun run dbpush` - Push database schema changes (Drizzle Kit)
- `bun run dbstudio` - Open Drizzle Studio for database management
- `bun run auth-schema` - Generate Better-auth schema file

### Check for Running Dev Server

Before starting a new dev server with `bun run dev`, check if one is already
running on localhost port 3000. This prevents multiple instances and port
conflicts.

---

## Architecture Decision Records

### Logging Decisions

Document all significant architectural decisions in `agent/decisions/` following
this template:

**Filename Format**: `YYYY_MM_DD_topic_description.md`

**Examples**:

- `2025_10_31_better_auth_integration.md`
- `2025_10_31_eventsourcingdb_vs_sqlite.md`
- `2025_11_15_api_rate_limiting_strategy.md`

### Summary Documentation Location

**All summary markdown files must be written to the `agent/summaries`
directory**, not anywhere else in the codebase. This includes:

- Implementation summaries
- Test strategy documents
- Architecture decision summaries
- Project milestone summaries

The `agent/` directory is the designated location for all agent-generated
documentation to maintain consistency and discoverability.

### Temporary Files

**If the agent needs temporary files, store them in `agent/tmp/`**. This
directory is designated for:

- Temporary data files
- Intermediate processing results
- Scratch files during development
- Any files that don't need to be committed to version control

The `agent/tmp/` directory should be cleaned up regularly and its contents
should not be relied upon for long-term storage.

### Keep ARCHITECTURE.md Concise

The `agent/ARCHITECTURE.md` file should remain a high-level overview. Move
detailed decision rationale, alternatives considered, and implementation
specifics into separate decision files in `agent/decisions/`.

---

## Documentation Search

### Using Context7 for Library Documentation

When you need to search for library documentation, use the `context7` tools:

1. **Resolve library ID first**: Use `context7_resolve-library-id` to get the
   correct Context7-compatible library ID
2. **Fetch documentation**: Use `context7_get-library-docs` with the resolved ID

Example workflow:

```typescript
// First resolve the library name to get the proper ID
const libraryId = await context7_resolve - library_id("react-query");

// Then fetch the documentation
const docs = await context7_get - library - docs(libraryId, {
    topic: "hooks",
    tokens: 5000,
});
```

Always resolve the library ID first unless you already have the exact
Context7-compatible format (e.g., `/tanstack/query`).

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

---

## Database Schema Patterns

### Better-Auth Managed Tables

Better-auth automatically manages these tables - **DO NOT modify them
directly**:

- `user` - Core user identity (id, name, email, emailVerified)
- `session` - Active user sessions (token, userId, expiresAt)
- `account` - Authentication providers (password hash stored here)
- `verification` - Email verification tokens

To regenerate the Better-auth schema: `bun run auth-schema`

### Application Tables

All custom tables must:

1. **Reference `user.id` as foreign key** for user-specific data
2. Use snake_case naming convention
3. Be defined in `src/db/schema/` (separate files by domain)

Example:

```typescript
export const userClockifyConfig = sqliteTable("user_clockify_config", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id),
    // ... other fields
});
```

### Custom Drizzle Types

Located in `src/db/types/`:

- `customIsoDate.ts` - ISO date string handling
- `customUint8Array.ts` - Binary data handling

Use these custom types when standard Drizzle types don't fit your needs.

---

## Authentication Patterns

### Server-Side Authentication

Always check session in server functions:

```typescript
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@/lib/auth/auth";

export const myServerFn = createServerFn("GET", async (_, { request }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const userId = session.user.id;
    // ... use userId in database queries
});
```

### Client-Side Authentication

Use the auth client from `src/client/auth-client.ts`:

```typescript
import { authClient } from "@/client/auth-client";

// Sign in
await authClient.signIn.email({
    email: "user@example.com",
    password: "password",
});

// Sign up
await authClient.signUp.email({
    email: "user@example.com",
    password: "password",
    name: "User Name",
});

// Get current session
const session = authClient.useSession();

// Sign out
await authClient.signOut();
```

### Route Protection

Protect routes by checking authentication in loaders:

```typescript
export const Route = createFileRoute("/protected")({
    beforeLoad: async ({ context }) => {
        const session = await auth.api.getSession({
            headers: context.request.headers,
        });
        if (!session?.user) {
            throw redirect({ to: "/signin" });
        }
    },
    // ... rest of route
});
```

### Important Notes

- Better-auth automatically handles password hashing
- Sessions use HTTP-only cookies (secure by default)
- `src/lib/auth/auth.ts` is a magic location - Better-auth auto-discovers it
- API route handler: `src/routes/api/auth/$.ts` (catch-all for Better-auth
  endpoints)

---

## Code Organization

### Directory Structure

```
src/
├── client/            # Client-side utilities (auth-client, etc.)
├── components/        # React components (organized by feature/domain)
├── db/
│   ├── index.ts       # Drizzle instance
│   ├── schema/        # Database schemas (separate by domain)
│   │   └── better-auth.ts  # Better-auth managed tables
│   └── types/         # Custom Drizzle column types
├── integrations/      # Third-party integrations (TanStack Query, etc.)
├── lib/               # Shared utilities and configurations
│   ├── auth/          # Better-auth configuration
│   └── env/           # Environment variable validation
├── server/            # ⭐ Server-only functions (safe to import envStore, db, auth)
├── routes/            # TanStack Start file-based routes
│   ├── api/           # API endpoints (server-side only)
│   └── __root.tsx     # Root layout component
└── routeTree.gen.ts   # Auto-generated route tree (don't edit)
```

### File Naming Conventions

- **Components**: PascalCase (e.g., `Header.tsx`, `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `envStore.ts`, `authClient.ts`)
- **Routes**: TanStack Router conventions (e.g., `index.tsx`, `signin.tsx`)
- **Database tables**: snake_case in schema definitions

### Where to Place New Code

- **Server functions** → `src/server/` (organize by domain, e.g.,
  `userServerFns.ts`, `clockifyServerFns.ts`)
- **Database schemas** → `src/db/schema/` (one file per domain)
- **API endpoints** → `src/routes/api/`
- **Shared utilities** → `src/lib/`
- **React components** → `src/components/` (organize by feature)
- **Types** → Co-locate with usage or `src/types/` for shared types

**Important**: If your code needs to import `envStore`, `db`, `auth`, or other
server-only modules, it MUST go in `src/server/`. Never import these directly in
route files.

---

## TanStack Router Conventions

### File-Based Routing

Routes are defined by file structure in `src/routes/`:

- `index.tsx` → `/`
- `signin.tsx` → `/signin`
- `demo/start.ssr.tsx` → `/demo/start/ssr`
- `api/auth/$.ts` → `/api/auth/*` (catch-all)

After adding/modifying routes, TanStack Router auto-generates
`src/routeTree.gen.ts` - **never edit this file manually**.

### Server Functions

Use `createServerFn` for server-side logic:

```typescript
import { createServerFn } from "@tanstack/react-start";

// GET request
export const getData = createServerFn("GET", async () => {
    // Server-side code only
    return { data: "value" };
});

// POST with validation
export const postData = createServerFn("POST")
    .inputValidator((input: MyType) => input)
    .handler(async ({ data }) => {
        // Server-side code with validated input
        return processData(data);
    });
```

Call from components:

```typescript
// Call server function
const result = await getData();
```

### Loaders vs Server Functions

**Use loaders** when:

- Data is needed for initial page render
- Data should be fetched before route navigation
- You want automatic loading states

```typescript
export const Route = createFileRoute("/my-route")({
    loader: async () => {
        return await getData();
    },
    component: MyComponent,
});

function MyComponent() {
    const data = Route.useLoaderData();
    return <div>{data.value}</div>;
}
```

**Use server functions** when:

- Handling mutations (POST, PUT, DELETE)
- Fetching data on user interaction
- Need more control over when data is fetched

### Router Context

Access the router context in routes:

```typescript
export const Route = createRootRouteWithContext<MyRouterContext>()({
    // ...
});

interface MyRouterContext {
    queryClient: QueryClient;
}
```

---

## Environment Variables

### Required Variables

Environment variables are validated using Zod in `src/lib/env/envStore.ts`:

```typescript
export const envStore = z.object({
    DATABASE_URL: z.string(),
    ALLOW_USER_SIGNUP: z.enum(["true", "false"]).default("false").transform((
        val,
    ) => val === "true"),
    ADMIN_EMAIL: z.email(),
    ADMIN_LABEL: z.string(),
    ADMIN_PASSWORD: z.string(),
}).parse(process.env);
```

### Current Variables

- `DATABASE_URL` - SQLite database file path (e.g., `file:./local/db.sqlite`)
- `ALLOW_USER_SIGNUP` - Allow user registration (defaults to `"false"`)
- `ADMIN_EMAIL` - Admin user email for `/registerAdmin` route
- `ADMIN_LABEL` - Admin user display name
- `ADMIN_PASSWORD` - Admin user password

### Adding New Variables

1. Add to `envStore` schema in `src/lib/env/envStore.ts`
2. Add to `.env` file (not committed to git)
3. Document in this section

### ⚠️ Critical: Server-Only Access Pattern

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
        return await myServerFunction({ data: {/* ... */} });
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
