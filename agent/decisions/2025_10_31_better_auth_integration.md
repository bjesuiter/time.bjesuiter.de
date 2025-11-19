# Decision: Better-Auth Integration

**Date**: 2025-10-31  
**Status**: ✅ IMPLEMENTED

---

## Decision Summary

**DECISION: Use Better-auth for authentication with its managed schema.**

Do NOT create custom authentication tables. Better-auth automatically manages user, session, account, and verification tables through the Drizzle adapter.

---

## What Changed

### From: Custom Authentication Tables

**Old approach (incorrect):**

```typescript
// Custom accounts table with password hash
accounts {
  id: string
  email: string
  passwordHash: string  // ❌ Don't manage passwords manually
  clockifyApiKey: string
  clockifyWorkspaceId: string
}
```

### To: Better-Auth Managed Tables + Application Tables

**Better-auth managed tables (automatic):**

1. **`user`** - Core user identity

   ```typescript
   {
     id: string (primary key)
     name: string
     email: string (unique)
     emailVerified: boolean
     image: string | null
     createdAt: timestamp
     updatedAt: timestamp
   }
   ```

2. **`session`** - Active user sessions

   ```typescript
   {
     id: string (primary key)
     expiresAt: timestamp
     token: string (unique)
     userId: string (foreign key -> user.id)
     ipAddress: string | null
     userAgent: string | null
     createdAt: timestamp
     updatedAt: timestamp
   }
   ```

3. **`account`** - Authentication providers

   ```typescript
   {
     id: string (primary key)
     accountId: string
     providerId: string  // e.g., "credential" for email/password
     userId: string (foreign key -> user.id)
     accessToken: string | null  // For OAuth
     refreshToken: string | null  // For OAuth
     password: string | null  // ✅ Hashed password (better-auth manages)
     createdAt: timestamp
     updatedAt: timestamp
   }
   ```

4. **`verification`** - Email verification tokens
   ```typescript
   {
     id: string (primary key)
     identifier: string  // Usually email
     value: string  // Verification token
     expiresAt: timestamp
     createdAt: timestamp
     updatedAt: timestamp
   }
   ```

**Application-specific table (you create):**

5. **`user_clockify_config`** - Clockify integration per user
   ```typescript
   {
     id: string (primary key)
     userId: string (foreign key -> user.id, unique)
     clockifyApiKey: string (encrypted)
     clockifyWorkspaceId: string
     clockifyUserId: string
     createdAt: timestamp
     updatedAt: timestamp
   }
   ```

---

## Key Schema Changes

### Foreign Key Updates

Changed all references from `accountId` to `userId`:

| Table                       | Field    | References |
| --------------------------- | -------- | ---------- |
| `user_clockify_config`      | `userId` | `user.id`  |
| `config_chronic`            | `userId` | `user.id`  |
| `cached_daily_project_sums` | `userId` | `user.id`  |
| `cached_daily_client_sums`  | `userId` | `user.id`  |
| `cached_weekly_sums`        | `userId` | `user.id`  |

### Example Schema Definition

```typescript
// src/db/schema/clockify.ts
import { user } from "./better-auth";

export const userClockifyConfig = sqliteTable("user_clockify_config", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  clockifyApiKey: text("clockify_api_key").notNull(), // Store encrypted
  clockifyWorkspaceId: text("clockify_workspace_id").notNull(),
  clockifyUserId: text("clockify_user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$onUpdate(() => new Date())
    .notNull(),
});
```

---

## Better-Auth Configuration

### Server Configuration

**File:** `src/lib/auth/auth.ts`

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { reactStartCookies } from "better-auth/react-start";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    reactStartCookies(), // TanStack Start integration
  ],
});
```

### Client Configuration

**File:** `src/client/auth-client.ts`

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // baseURL: optional if using same domain
  // Default: /api/auth
});
```

### API Route Configuration

**File:** `src/routes/api/auth/$.ts`

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/auth";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => auth.handler(request),
      POST: async ({ request }) => auth.handler(request),
    },
  },
});
```

This automatically handles all better-auth endpoints:

- `/api/auth/sign-up/email` - User registration
- `/api/auth/sign-in/email` - User login
- `/api/auth/sign-out` - User logout
- `/api/auth/session` - Get current session
- And more

---

## Usage Examples

### Client-Side Authentication

```typescript
import { authClient } from "@/client/auth-client";

// Sign up
await authClient.signUp.email({
  email: "user@example.com",
  password: "secure-password",
  name: "User Name",
});

// Sign in
await authClient.signIn.email({
  email: "user@example.com",
  password: "secure-password",
});

// Sign out
await authClient.signOut();

// Get session
const { data: session } = authClient.useSession();

// In components
function MyComponent() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Not logged in</div>;

  return <div>Welcome, {session.user.name}!</div>;
}
```

### Server-Side Session Access

```typescript
import { createServerFn } from "@tanstack/react-router";
import { auth } from "@/lib/auth/auth";

export const getClockifyData = createServerFn("GET", async (_, { request }) => {
  // Get session from request
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Access user ID for queries
  const userId = session.user.id;

  // Fetch user's Clockify config
  const clockifyConfig = await db
    .select()
    .from(userClockifyConfig)
    .where(eq(userClockifyConfig.userId, userId))
    .limit(1);

  // Use decrypted API key for Clockify API calls
  // ...
});
```

### Authentication Flow

1. **Sign Up**
   - User registers with email and password
   - Better-auth creates record in `user` table
   - Hashed password stored in `account.password` field
   - Verification token created in `verification` table

2. **Sign In**
   - User logs in with credentials
   - Better-auth verifies password against `account.password`
   - Creates session in `session` table
   - Returns session token via HTTP-only cookie

3. **Session Management**
   - TanStack Start integration via `reactStartCookies()` plugin
   - Automatic session validation on server requests
   - Secure cookie-based session handling

4. **Clockify Setup** (after authentication)
   - User enters Clockify API key
   - System validates key via Clockify API
   - Stores encrypted key in `user_clockify_config` table
   - Links to `user.id` for data isolation

---

## Security Considerations

### Password Storage

- ✅ Better-auth handles password hashing automatically (bcrypt/argon2)
- ✅ Passwords stored in `account.password` field (hashed)
- ❌ Never store or log plaintext passwords
- ❌ Don't create custom password fields

### Session Management

- ✅ HTTP-only cookies prevent XSS attacks
- ✅ Secure flag for HTTPS-only transmission
- ✅ Session tokens automatically rotated
- ✅ TanStack Start integration via `reactStartCookies()` plugin

### API Key Encryption (Clockify)

- ✅ Encrypt Clockify API keys before storing in `user_clockify_config`
- ✅ Use `crypto` module with AES-256-GCM
- ✅ Store encryption key in environment variable
- ❌ Never expose API keys in client-side code
- ✅ All Clockify API calls happen server-side

**Example encryption:**

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Encryption key stored in environment variable
const ENCRYPTION_KEY = process.env.CLOCKIFY_ENCRYPTION_KEY; // 32 bytes

function encryptApiKey(apiKey: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  // ... implementation
}
```

### Data Access & Isolation

- ✅ All database queries must filter by `userId`
- ✅ Check session validity before processing requests
- ✅ Return 401 for unauthenticated requests
- ✅ Return 403 for unauthorized data access attempts

**Example query pattern:**

```typescript
// Always filter by userId
const data = await db
  .select()
  .from(config_chronic)
  .where(eq(config_chronic.userId, session.user.id));
```

---

## Design Principles

### ✅ DO:

- Use better-auth's managed schema for authentication
- Create separate tables for application-specific data
- Reference `user.id` in foreign keys
- Use `auth.api.getSession()` in server functions
- Filter all queries by `userId` for data isolation
- Encrypt sensitive data (Clockify API keys)

### ❌ DON'T:

- Create custom auth tables with password fields
- Modify better-auth's managed tables
- Store passwords yourself
- Expose API keys to client-side
- Skip session validation in server functions
- Forget to filter by userId in queries

---

## Code Organization

```
src/
├── lib/
│   ├── auth/          # Better-auth configuration (auth.ts)
│   ├── clockify/      # Clockify API client and encryption utilities
│   ├── cache/         # Cache management logic
│   └── config/        # Configuration versioning logic
├── db/
│   ├── index.ts       # Drizzle instance
│   ├── schema/
│   │   ├── better-auth.ts    # Better-auth managed tables
│   │   ├── clockify.ts       # user_clockify_config table
│   │   ├── config.ts         # config_chronic table
│   │   └── cache.ts          # Cache tables (daily/weekly sums)
│   └── types/         # Custom Drizzle column types
├── routes/            # TanStack Start routes
│   ├── api/           # API endpoints (including auth)
│   ├── signin.tsx     # Sign in page
│   ├── signup.tsx     # Sign up page
│   └── setup/         # Clockify setup wizard
├── components/        # React components
│   ├── auth/          # Auth-related components
│   ├── setup/         # Setup wizard components
│   └── dashboard/     # Dashboard components
└── types/             # Shared TypeScript types
```

---

## Migration Notes

If you have an existing `accounts` table with `passwordHash`:

1. **Do NOT migrate password hashes** - Better-auth uses its own hashing
2. Instead, prompt users to reset passwords during migration
3. Or implement a one-time migration that re-hashes passwords using better-auth's API

---

## Next Steps

1. ✅ Better-auth configured with email authentication
2. ✅ Drizzle ORM set up with SQLite
3. ✅ Better-auth schema tables created
4. [ ] Create `user_clockify_config` table schema
5. [ ] Build user registration/login UI
6. [ ] Create setup wizard for Clockify integration
7. [ ] Implement Clockify API key encryption

---

## References

- [Better-auth Documentation](https://www.better-auth.com/docs)
- [Better-auth Drizzle Adapter](https://www.better-auth.com/docs/adapters/drizzle)
- [Better-auth TanStack Integration](https://www.better-auth.com/docs/integrations/tanstack)
- [Better-auth API Endpoints](https://www.better-auth.com/docs/concepts/api)

---

_Decision implemented: 2025-10-31_
