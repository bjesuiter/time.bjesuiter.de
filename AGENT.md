# Agent Guidelines

This document contains guidelines for AI agents working on this codebase.

---

## Communication Guidelines

### Be Concise by Default

**Always summarize your work in one sentence unless asked for more details.**

After completing a task:

- ✅ **Do**: "Created 3 decision documents and updated ARCHITECTURE.md."
- ❌ **Don't**: List every file change, explain each decision in detail, show
  code snippets unprompted.

If the user wants more information, they will ask. Keep responses focused and
brief.

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

### Keep ARCHITECTURE.md Concise

The `agent/ARCHITECTURE.md` file should remain a high-level overview. Move
detailed decision rationale, alternatives considered, and implementation
specifics into separate decision files in `agent/decisions/`.

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

- **Server functions** → Define in route files or `src/lib/`
- **Database schemas** → `src/db/schema/` (one file per domain)
- **API endpoints** → `src/routes/api/`
- **Shared utilities** → `src/lib/`
- **React components** → `src/components/` (organize by feature)
- **Types** → Co-locate with usage or `src/types/` for shared types

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
}).parse(process.env);
```

### Current Variables

- `DATABASE_URL` - SQLite database file path (e.g., `file:./local/db.sqlite`)

### Adding New Variables

1. Add to `envStore` schema in `src/lib/env/envStore.ts`
2. Add to `.env` file (not committed to git)
3. Document in this section

### Usage

```typescript
import { envStore } from "@/lib/env/envStore";

const dbUrl = envStore.DATABASE_URL;
```

**Never** access `process.env` directly - always use `envStore` for type safety
and validation.

---
