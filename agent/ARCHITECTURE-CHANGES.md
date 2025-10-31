# Architecture Documentation Updates

## Summary of Changes

This document summarizes the updates made to `ARCHITECTURE.md` to properly
reflect the use of Better-auth for authentication management.

---

## Key Changes

### 1. Database Schema Corrections ✅

**Before**: Custom `accounts` table with:

- `passwordHash` field
- `email` field
- `clockifyApiKey` field
- `clockifyWorkspaceId` field

**After**: Better-auth managed tables + separate application table:

**Better-auth tables** (managed automatically):

1. `user` - Core user identity
2. `session` - Active sessions
3. `account` - Authentication providers (password stored in `password` field,
   hashed)
4. `verification` - Email verification tokens

**Application-specific table**: 5. `user_clockify_config` - Clockify integration
data

- References `user.id` as foreign key
- Contains `clockifyApiKey` (encrypted)
- Contains `clockifyWorkspaceId`
- One-to-one relationship with user

### 2. Updated All Foreign Key References

Changed all references from `accountId` to `userId` in:

- `config_chronic` table
- `cached_daily_project_sums` table
- `cached_daily_client_sums` table
- `cached_weekly_sums` table
- SQL query examples

### 3. Added Better-Auth Integration Section

New comprehensive section covering:

- **Configuration**: How better-auth is set up with Drizzle adapter
- **Schema Management**: Warning not to modify better-auth tables
- **Extending Better-Auth**: Pattern for adding application-specific tables
- **Authentication Flow**: Complete sign-up, sign-in, and session flow
- **Client-Side Integration**: React hooks and API usage
- **API Route Integration**: TanStack Router catch-all route
- **Server-Side Session Access**: How to get current user in server functions
- **Security Considerations**: Password hashing, session management
- **Migration Notes**: How to handle existing password data

### 4. Updated Security Section

Enhanced security documentation:

- Better-auth's automatic password hashing (bcrypt/argon2)
- HTTP-only cookie configuration
- Session token rotation
- Clockify API key encryption pattern
- User data isolation patterns
- Authentication guards

### 5. Updated Implementation Phases

Phase 1 now reflects:

- ✅ Better-auth already configured
- ✅ Drizzle ORM set up
- ✅ Better-auth schema created
- Remaining: UI components, Clockify setup wizard

### 6. Updated Code Organization

Added proper directory structure showing:

- `src/db/schema/` with separate files:
  - `better-auth.ts` (managed by better-auth)
  - `clockify.ts` (application-specific)
  - `config.ts` (temporal configuration)
  - `cache.ts` (cache tables)

---

## Important Design Principles

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

## Code Examples Added

### 1. Extending Better-Auth Schema

```typescript
export const userClockifyConfig = sqliteTable("user_clockify_config", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .unique()
        .references(() => user.id, { onDelete: "cascade" }),
    // ... Clockify-specific fields
});
```

### 2. Server-Side Session Access

```typescript
export const getClockifyData = createServerFn("GET", async (_, { request }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const userId = session.user.id;
    // ... query with userId filter
});
```

### 3. Client-Side Authentication

```typescript
import { authClient } from "@/client/auth-client";

// Sign up
await authClient.signUp.email({
    email: "user@example.com",
    password: "secure-password",
    name: "User Name",
});

// Get session
const { data: session } = authClient.useSession();
```

---

## References

- **Better-auth Documentation**: https://www.better-auth.com/docs
- **Better-auth Drizzle Adapter**:
  https://www.better-auth.com/docs/adapters/drizzle
- **Better-auth TanStack Integration**:
  https://www.better-auth.com/docs/integrations/tanstack

---

## Next Steps

1. **Create Clockify schema** (`src/db/schema/clockify.ts`)
   - Define `user_clockify_config` table
   - Run Drizzle migrations

2. **Implement encryption utilities** (`src/lib/clockify/encryption.ts`)
   - AES-256-GCM encryption for API keys
   - Environment variable for encryption key

3. **Build authentication UI**
   - Sign up form (`/signup`)
   - Sign in form (`/signin`)
   - Use `authClient` hooks

4. **Create Clockify setup wizard**
   - API key validation
   - Workspace selection
   - Initial configuration

5. **Implement server functions**
   - Use `auth.api.getSession()` for authentication
   - Filter all queries by `userId`
   - Decrypt Clockify API keys for API calls

---

_Last updated: 2025-10-31_
