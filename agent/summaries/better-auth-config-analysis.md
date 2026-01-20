# Better Auth Configuration Analysis

## Current Date
January 20, 2026

## Better Auth Required Environment Variables

### CRITICAL (Must Have)
1. **BETTER_AUTH_SECRET** (32+ chars, high entropy)
   - Used for encryption and hashing
   - Generate with: `openssl rand -base64 32`
   - Current status: ✅ In `.env.example` as placeholder

2. **BETTER_AUTH_URL** (Base URL)
   - Where your application is running
   - Used for redirects and callbacks
   - Current status: ✅ In `.env.example` as `http://localhost:3000`

### OPTIONAL (Depends on Features)
- Social provider credentials (GOOGLE_CLIENT_ID, GITHUB_CLIENT_ID, etc.)
- Database-specific URLs (handled via DATABASE_URL)

---

## Your Current Configuration

### ✅ What's Correct
1. **Database Setup**
   - Using Drizzle ORM adapter (recommended pattern)
   - SQLite provider configured correctly
   - All Better Auth tables properly defined (user, session, account, verification)

2. **Environment Variables**
   - `BETTER_AUTH_SECRET` defined in `.env.example`
   - `BETTER_AUTH_URL` defined in `.env.example`
   - `DATABASE_URL` properly configured

3. **Auth Instance Location**
   - `src/lib/auth/auth.ts` (auto-discovered by Better Auth)
   - Correct export: `export const auth = betterAuth({...})`

4. **TanStack Start Integration**
   - Using `reactStartCookies()` plugin (correct for React)
   - Proper cookie handling for TanStack Start

5. **Client Setup**
   - `createAuthClient` from "better-auth/react" (correct)
   - Proper React integration

---

## Recommended Improvements

### 1. **Add BETTER_AUTH_SECRET to envStore Validation**
**Current Issue**: BETTER_AUTH_SECRET is NOT validated in `envStore.ts`
- It's used by Better Auth internally but not validated by your app
- No type safety or runtime validation

**Recommendation**:
```typescript
// src/lib/env/envStore.ts
export const envStore = z
  .object({
    // ... existing fields
    BETTER_AUTH_SECRET: z.string().min(32, "Must be at least 32 characters"),
    BETTER_AUTH_URL: z.string().url("Must be a valid URL"),
  })
  .parse(process.env);
```

**Why**: 
- Ensures secret is properly set before app starts
- Catches configuration errors early
- Provides type safety across the app

---

### 2. **Add BETTER_AUTH_URL to envStore**
**Current Issue**: `BETTER_AUTH_URL` is in `.env.example` but not validated
- Better Auth uses it internally
- Your app should also use it for client-side auth client configuration

**Recommendation**:
```typescript
// src/lib/auth/auth.ts
import { envStore } from "@/lib/env/envStore";

export const auth = betterAuth({
  baseURL: envStore.BETTER_AUTH_URL, // Add this
  // ... rest of config
});
```

```typescript
// src/client/auth-client.ts
import { envStore } from "@/lib/env/envStore"; // Can't import here (client code)
// Instead, use import.meta.env or pass via config

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL || window.location.origin,
});
```

---

### 3. **Add VITE_BETTER_AUTH_URL to envStore**
**Current Issue**: `VITE_SERVER_URL` is defined but `VITE_BETTER_AUTH_URL` is not
- Client-side code needs the auth URL
- Currently commented out in auth-client.ts

**Recommendation**:
```typescript
// src/lib/env/envStore.ts
export const envStore = z
  .object({
    // ... existing
    VITE_BETTER_AUTH_URL: z.string().url().optional(),
  })
  .parse(process.env);
```

```typescript
// src/client/auth-client.ts
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL,
});
```

---

### 4. **Add Session Validation Helper**
**Current Issue**: No centralized session validation pattern
- Better Auth provides `auth.api.getSession()` but it's not documented in your codebase
- No clear pattern for server functions to check auth

**Recommendation**:
```typescript
// src/server/auth.ts
import { auth } from "@/lib/auth/auth";

export async function getSessionOrThrow(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session;
}

export async function getSessionOrNull(request: Request) {
  return await auth.api.getSession({ headers: request.headers });
}
```

**Usage**:
```typescript
// src/server/myServerFns.ts
import { createServerFn } from "@tanstack/react-start";
import { getSessionOrThrow } from "@/server/auth";

export const getProtectedData = createServerFn({ method: "GET" })
  .handler(async ({ request }) => {
    const session = await getSessionOrThrow(request);
    // Now you have session.user
    return { userId: session.user.id };
  });
```

---

### 5. **Document Auth Flow in README**
**Current Issue**: No clear documentation of how auth works in this project
- Better Auth setup is not explained
- Session management pattern is unclear

**Recommendation**: Add to README:
```markdown
## Authentication

### Setup
1. Better Auth is configured in `src/lib/auth/auth.ts`
2. Database tables are auto-managed by Better Auth
3. Client-side auth is in `src/client/auth-client.ts`

### Environment Variables
- `BETTER_AUTH_SECRET`: Encryption key (32+ chars)
- `BETTER_AUTH_URL`: Base URL for auth callbacks
- `VITE_BETTER_AUTH_URL`: Client-side auth URL (optional, defaults to same origin)

### Server-Side Session Check
```typescript
import { getSessionOrThrow } from "@/server/auth";

export const myServerFn = createServerFn({ method: "GET" })
  .handler(async ({ request }) => {
    const session = await getSessionOrThrow(request);
    // session.user is available
  });
```

### Client-Side Usage
```typescript
import { authClient } from "@/client/auth-client";

const { data: session } = await authClient.getSession();
```
```

---

### 6. **Add Trusted Origins Validation**
**Current Issue**: `trustedOrigins` is hardcoded
- Should be environment-based for different deployments
- Production URL is hardcoded

**Recommendation**:
```typescript
// src/lib/env/envStore.ts
export const envStore = z
  .object({
    // ... existing
    TRUSTED_ORIGINS: z.string()
      .transform(val => val.split(',').map(s => s.trim()))
      .default("http://localhost:3000,http://localhost:3001"),
  })
  .parse(process.env);
```

```typescript
// src/lib/auth/auth.ts
import { envStore } from "@/lib/env/envStore";

export const auth = betterAuth({
  trustedOrigins: envStore.TRUSTED_ORIGINS,
  // ... rest
});
```

---

### 7. **Add Email Configuration (Optional but Recommended)**
**Current Issue**: Email sending is not configured
- Better Auth can send verification emails
- Currently no email provider is set up

**Recommendation** (if needed):
```typescript
// src/lib/auth/auth.ts
import { emailOTP } from "better-auth/plugins";

export const auth = betterAuth({
  // ... existing config
  plugins: [
    emailOTP({
      sendEmail: async (email, code) => {
        // Implement email sending (Resend, SendGrid, etc.)
        console.log(`Email to ${email}: ${code}`);
      },
    }),
    reactStartCookies(),
  ],
});
```

---

## Summary of Improvements

| Issue | Priority | Effort | Impact |
|-------|----------|--------|--------|
| Add BETTER_AUTH_SECRET to envStore | HIGH | 5 min | Catches config errors early |
| Add BETTER_AUTH_URL to envStore | HIGH | 5 min | Type safety for auth URL |
| Add session validation helper | HIGH | 10 min | Clearer auth pattern |
| Document auth flow in README | MEDIUM | 10 min | Better onboarding |
| Make trustedOrigins configurable | MEDIUM | 10 min | Better for deployments |
| Add email configuration | LOW | 20 min | Only if needed |

---

## Implementation Order
1. ✅ Add BETTER_AUTH_SECRET & BETTER_AUTH_URL to envStore
2. ✅ Create session validation helpers in `src/server/auth.ts`
3. ✅ Update auth-client.ts to use VITE_BETTER_AUTH_URL
4. ✅ Make trustedOrigins configurable
5. ✅ Update README with auth documentation
6. ⏭️ Add email configuration (if needed)

