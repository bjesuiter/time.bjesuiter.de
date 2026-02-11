# Better Auth Configuration Review

## Current Implementation Status

### ✅ What You're Doing Well

1. **Correct Route Integration**
   - Using TanStack Start adapter correctly with `createFileRoute("/api/auth/$")`
   - Properly delegating GET/POST to `auth.handler(request)`
   - Matches official Better Auth documentation pattern

2. **Environment Variable Management**
   - `BETTER_AUTH_SECRET` is set in `.env` (32+ character random string)
   - Using Zod schema for validation in `envStore.ts`
   - Secrets are NOT hardcoded in source

3. **Database Integration**
   - Using Drizzle adapter with SQLite
   - Proper configuration: `drizzleAdapter(db, { provider: "sqlite" })`

4. **Client Setup**
   - `authClient` created with `createAuthClient` from better-auth/react
   - Properly imported in components

5. **Session Usage**
   - Using `authClient.useSession()` hook in components
   - Checking `isPending` state for loading

### ⚠️ Issues & Gaps

#### 1. **Missing Secret Configuration in Auth Instance**

**Current:**

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  // ... no secret specified
});
```

**Issue:** Better Auth defaults to checking `BETTER_AUTH_SECRET` or `AUTH_SECRET` env vars, but it's better to be explicit. In production, if neither is set, it throws an error. Your setup works but lacks explicit configuration.

**Recommendation:** Add explicit secret configuration:

```typescript
import { envStore } from "@/lib/env/envStore";

export const auth = betterAuth({
  secret: envStore.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "sqlite" }),
  // ...
});
```

**Why:**

- Explicit is better than implicit
- Ensures secret is validated at startup
- Makes dependency clear in code

---

#### 2. **Missing Base URL Configuration**

**Current:** Not configured in auth instance

**Issue:** Better Auth needs to know your application's base URL for:

- Redirect URIs in OAuth flows
- Email verification links
- Password reset links
- CORS validation

**Recommendation:** Add to auth config:

```typescript
export const auth = betterAuth({
  secret: envStore.BETTER_AUTH_SECRET,
  baseURL: envStore.BETTER_AUTH_URL, // Add to envStore
  database: drizzleAdapter(db, { provider: "sqlite" }),
  // ...
});
```

**Update envStore:**

```typescript
export const envStore = z
  .object({
    // ... existing fields
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "Secret must be at least 32 characters"),
    BETTER_AUTH_URL: z.string().url("Must be a valid URL"),
  })
  .parse(process.env);
```

---

#### 3. **No Server-Side Session Retrieval Pattern**

**Current:** Only using client-side `authClient.useSession()`

**Issue:**

- Server functions can't access session data
- Can't protect server functions based on auth
- No pattern for server-side auth checks

**Recommendation:** Create a server utility for session retrieval:

```typescript
// src/server/auth.ts
import { auth } from "@/lib/auth/auth";

export async function getServerSession(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  return session;
}

export async function requireAuth(request: Request) {
  const session = await getServerSession(request);
  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session;
}
```

**Usage in server functions:**

```typescript
export const getClockifyData = createServerFn({ method: "GET" }).handler(
  async ({ request }) => {
    const session = await requireAuth(request);
    // Now you have session.user.id for database queries
    return await db.query.userClockifyConfig.findFirst({
      where: eq(userClockifyConfig.userId, session.user.id),
    });
  },
);
```

---

#### 4. **No Route Protection Pattern**

**Current:** Routes check session in component with `useSession()`, but no server-side protection

**Issue:**

- Routes can be accessed before session loads
- No server-side validation
- Potential race conditions

**Recommendation:** Add `beforeLoad` hook for protected routes:

```typescript
// src/routes/settings.tsx
import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "@/server/auth";

export const Route = createFileRoute("/settings")({
  beforeLoad: async ({ request }) => {
    const session = await getServerSession(request);
    if (!session) {
      throw redirect({ to: "/signin" });
    }
    return { session };
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { session } = Route.useLoaderData();
  // session is guaranteed to exist
}
```

---

#### 5. **Missing BETTER_AUTH_SECRET in envStore**

**Current:** Secret is in `.env` but not validated in `envStore.ts`

**Issue:**

- No type safety for secret
- No validation that it meets minimum length
- Could fail at runtime if secret is too short

**Recommendation:** Add to envStore:

```typescript
export const envStore = z
  .object({
    // ... existing
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "BETTER_AUTH_SECRET must be at least 32 characters")
      .describe(
        "Encryption secret for Better Auth (generate with: openssl rand -base64 32)",
      ),
    BETTER_AUTH_URL: z
      .string()
      .url()
      .describe(
        "Base URL of your application (e.g., https://time.bjesuiter.de)",
      ),
  })
  .parse(process.env);
```

---

#### 6. **No Explicit CORS/Trust Configuration for Production**

**Current:**

```typescript
trustedOrigins: [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://time.bjesuiter.de",
],
```

**Issue:**

- Hardcoded origins in code
- Not environment-aware
- Difficult to manage across dev/staging/prod

**Recommendation:** Make dynamic:

```typescript
const getTrustedOrigins = () => {
  const origins = ["http://localhost:3000", "http://localhost:3001"];

  if (process.env.NODE_ENV === "production") {
    origins.push("https://time.bjesuiter.de");
  }

  return origins;
};

export const auth = betterAuth({
  // ...
  trustedOrigins: getTrustedOrigins(),
});
```

Or better, use environment variable:

```typescript
// In .env
TRUSTED_ORIGINS="http://localhost:3000,http://localhost:3001,https://time.bjesuiter.de"

// In envStore
TRUSTED_ORIGINS: z
  .string()
  .transform(val => val.split(",").map(o => o.trim()))
  .default("http://localhost:3000"),
```

---

#### 7. **No Error Handling in Auth Route**

**Current:**

```typescript
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return await auth.handler(request);
      },
      POST: async ({ request }) => {
        return await auth.handler(request);
      },
    },
  },
});
```

**Issue:**

- No error handling
- No logging
- Errors bubble up unhandled

**Recommendation:** Add error handling:

```typescript
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await auth.handler(request);
        } catch (error) {
          console.error("[Auth] GET error:", error);
          return new Response("Authentication error", { status: 500 });
        }
      },
      POST: async ({ request }) => {
        try {
          return await auth.handler(request);
        } catch (error) {
          console.error("[Auth] POST error:", error);
          return new Response("Authentication error", { status: 500 });
        }
      },
    },
  },
});
```

---

#### 8. **No Session Invalidation on Logout**

**Current:** Using `authClient.signOut()` but no server-side cleanup

**Issue:**

- Sessions might persist in database
- No audit trail of logouts
- Potential security issue if session table grows unbounded

**Recommendation:** Add server-side logout handler:

```typescript
// src/server/auth.ts
export const logoutUser = createServerFn({ method: "POST" }).handler(
  async ({ request }) => {
    const session = await getServerSession(request);
    if (session) {
      // Optional: Log the logout event
      console.log(`[Auth] User ${session.user.id} logged out`);
      // Better Auth handles session cleanup automatically
    }
    return { success: true };
  },
);
```

---

#### 9. **Missing .env.example**

**Current:** `.env` exists but no `.env.example` for documentation

**Issue:**

- New developers don't know what variables are needed
- No documentation of secret generation

**Recommendation:** Create `.env.example`:

```dotenv
# Environment
ENVIRONMENT="dev"
DATABASE_URL="file:./local/db.sqlite"

# Better Auth Configuration
# Generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=your_32_character_random_secret_here
BETTER_AUTH_URL=http://localhost:3000

# Server URL (for client-side API calls)
VITE_SERVER_URL=http://localhost:3000

# Security
ALLOW_USER_SIGNUP="false"

# Admin User (for initial setup)
ADMIN_EMAIL="admin@example.com"
ADMIN_LABEL="Admin User"
ADMIN_PASSWORD="change_this_password_123"
```

---

#### 10. **No Session Refresh Strategy**

**Current:** Sessions rely on cookie expiration

**Issue:**

- No explicit session refresh mechanism
- Long-lived sessions could be security risk
- No way to force logout all sessions

**Recommendation:** Add session management utilities:

```typescript
// src/server/sessionManagement.ts
export const revokeAllUserSessions = createServerFn({ method: "POST" }).handler(
  async ({ request }) => {
    const session = await requireAuth(request);

    // Get all sessions for this user
    const userSessions = await auth.api.listSessions({
      headers: request.headers,
    });

    // Revoke all except current
    for (const s of userSessions) {
      if (s.token !== session.session.token) {
        await auth.api.revokeSession({ token: s.token });
      }
    }

    return { success: true };
  },
);
```

---

## Summary of Recommendations

| Priority  | Issue                                 | Action                                                                    |
| --------- | ------------------------------------- | ------------------------------------------------------------------------- |
| 🔴 High   | Missing server-side session retrieval | Create `src/server/auth.ts` with `getServerSession()` and `requireAuth()` |
| 🔴 High   | No route protection pattern           | Add `beforeLoad` hooks to protected routes                                |
| 🟡 Medium | Missing secret in envStore            | Add `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` to validation              |
| 🟡 Medium | Hardcoded trusted origins             | Move to environment variable                                              |
| 🟡 Medium | No error handling in auth route       | Add try-catch with logging                                                |
| 🟢 Low    | No `.env.example`                     | Create documentation file                                                 |
| 🟢 Low    | No session management utilities       | Add logout/revoke helpers                                                 |

---

## Implementation Priority

1. **Phase 1 (Critical):** Server-side session retrieval + route protection
2. **Phase 2 (Important):** Environment variable validation + error handling
3. **Phase 3 (Nice-to-have):** Session management utilities + documentation
