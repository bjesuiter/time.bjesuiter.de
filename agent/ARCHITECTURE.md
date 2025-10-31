# Architecture Documentation

**Last Updated**: 2025-10-31

---

## Overview

Time tracking dashboard that integrates with Clockify, providing weekly time summaries with configurable project tracking and automated overtime calculations.

---

## Technology Stack

### Frontend
- **Framework**: TanStack Start (Full-stack React framework)
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack Query
- **State Management**: TanStack Query + React state

### Backend
- **Runtime**: Bun
- **API**: TanStack Start server functions
- **Authentication**: Better-auth (email authentication)

### Database
- **Engine**: SQLite
- **ORM**: Drizzle ORM
- **Migrations**: Drizzle Kit

### External APIs
- **Clockify REST API**
  - Base URL: `https://api.clockify.me/api/v1/`
  - Reports URL: `https://reports.api.clockify.me/v1/`
  - Authentication: X-Api-Key header

---

## Database Schema

### Better-Auth Managed Tables

Better-auth automatically manages these core authentication tables (see [Decision: Better-Auth Integration](decisions/2025_10_31_better_auth_integration.md)):

1. **`user`** - Core user identity (id, name, email, emailVerified)
2. **`session`** - Active user sessions (token, userId, expiresAt)
3. **`account`** - Authentication providers (password hash stored here)
4. **`verification`** - Email verification tokens

### Application-Specific Tables

**5. `user_clockify_config`** - Clockify integration per user
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

**6. `config_chronic`** - Versioned configuration tracking (chronicle)

Stores both current and historical configurations with temporal validity.

```typescript
{
  id: string (primary key)
  userId: string (foreign key -> user.id)
  configType: enum('tracked_projects', 'regular_hours', 'client_filter')
  value: json
  validFrom: timestamp      // When this config became active
  validUntil: timestamp | null  // null = current config
  createdAt: timestamp
}
```

**Config Type Values:**
- `tracked_projects`: `{ projectIds: string[] }` - Projects shown in daily columns
- `regular_hours`: `{ hoursPerWeek: number }` - Baseline for overtime calculation
- `client_filter`: `{ clientId: string, clientName: string }` - Client for weekly totals

**7. `cached_daily_project_sums`** - Pre-calculated daily totals

```typescript
{
  id: string (primary key)
  userId: string (foreign key -> user.id)
  date: date (YYYY-MM-DD)
  projectIds: json (array)
  totalSeconds: number
  configSnapshotId: string
  calculatedAt: timestamp
  invalidatedAt: timestamp | null
}
```

**8. `cached_daily_client_sums`** - Pre-calculated client totals

```typescript
{
  id: string (primary key)
  userId: string (foreign key -> user.id)
  date: date (YYYY-MM-DD)
  clientId: string
  totalSeconds: number
  calculatedAt: timestamp
  invalidatedAt: timestamp | null
}
```

**9. `cached_weekly_sums`** - Pre-calculated weekly totals and overtime

```typescript
{
  id: string (primary key)
  userId: string (foreign key -> user.id)
  weekStart: date (Monday)
  weekEnd: date (Sunday)
  clientId: string
  totalSeconds: number
  regularHoursBaseline: number
  overtimeSeconds: number
  cumulativeOvertimeSeconds: number
  configSnapshotId: string
  calculatedAt: timestamp
  invalidatedAt: timestamp | null
}
```

---

## Configuration Versioning Strategy

**Pattern**: Temporal Tables (Slowly Changing Dimension Type 2)

**Decision**: See [Decision: EventSourcingDB vs SQLite](decisions/2025_10_31_eventsourcingdb_vs_sqlite.md)

### How It Works

Using `config_chronic` table with `validFrom` and `validUntil` timestamps:

**Example Workflow:**
1. User sets tracked projects to `["SMC 1.8"]` on 2025-10-01
   ```
   configType: 'tracked_projects'
   value: { projectIds: ["project_id_smc18"] }
   validFrom: 2025-10-01T00:00:00Z
   validUntil: null
   ```

2. User updates to `["SMC 1.9"]` on 2025-11-01
   - Previous record updated: `validUntil: 2025-11-01T00:00:00Z`
   - New record created with `validFrom: 2025-11-01T00:00:00Z`, `validUntil: null`

**Query Pattern:**
```sql
SELECT * FROM config_chronic
WHERE userId = ?
  AND configType = 'tracked_projects'
  AND validFrom <= '2025-10-15'
  AND (validUntil IS NULL OR validUntil > '2025-10-15')
```

---

## Cache Invalidation Strategy

**Decision**: Timestamp-based invalidation (NOT event sourcing). See [Decision: EventSourcingDB vs SQLite](decisions/2025_10_31_eventsourcingdb_vs_sqlite.md)

### When to Invalidate

**Trigger Events:**
1. **Configuration Change** - Invalidate all cached data from `validFrom` date forward
2. **Manual Refresh** - User requests fresh data from Clockify
3. **New Time Entries** - Invalidate recent dates (last 7-14 days) periodically

### Cache Lookup Flow

```
1. Check cached_daily_project_sums for date
   ├─ Found & not invalidated? → Use cached value
   └─ Not found or invalidated? → Fetch from Clockify, recalculate, cache

2. Check cached_weekly_sums for week
   ├─ Found & not invalidated? → Use cached value
   └─ Not found or invalidated? → Aggregate daily_client_sums, cache
```

---

## Clockify API Integration

### Authentication & User Info

**Endpoint**: `GET https://api.clockify.me/api/v1/user`

**Headers**: `X-Api-Key: {user's_clockify_api_key}`

**Purpose**: Validate API key, get user profile, list available workspaces

### Time Reports Summary

**Endpoint**: `POST https://reports.api.clockify.me/v1/workspaces/{workspaceId}/reports/summary`

**Request Body**:
```json
{
  "dateRangeStart": "2025-10-20T00:00:00.000Z",
  "dateRangeEnd": "2025-10-26T23:59:59.999Z",
  "summaryFilter": {
    "groups": ["DATE", "PROJECT"]
  },
  "clients": {
    "ids": ["client_id"],
    "contains": "CONTAINS"
  },
  "projects": {
    "ids": ["project_id_1", "project_id_2"],
    "contains": "CONTAINS"
  }
}
```

**Purpose**: Fetch time summaries grouped by date and project, filtered by client/projects

---

## Better-Auth Integration

**Status**: ✅ Configured and ready

Better-auth is a comprehensive authentication framework that manages its own database schema. See [Decision: Better-Auth Integration](decisions/2025_10_31_better_auth_integration.md) for details.

### Key Points
- ✅ Better-auth manages its own schema (user, session, account, verification)
- ✅ Passwords automatically hashed and stored in `account.password`
- ✅ Store application-specific data in separate tables (e.g., `user_clockify_config`)
- ✅ Always reference `user.id` as foreign key
- ✅ Client and server integration already configured

### Configuration

**Server**: `src/lib/auth/auth.ts`
```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  plugins: [reactStartCookies()],
});
```

**Client**: `src/client/auth-client.ts`
```typescript
export const authClient = createAuthClient();
```

**API Routes**: `src/routes/api/auth/$.ts` (catch-all handler)

### Server-Side Session Access

```typescript
import { createServerFn } from "@tanstack/react-router";
import { auth } from "@/lib/auth/auth";

export const myServerFn = createServerFn("GET", async (_, { request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  
  const userId = session.user.id;
  // ... use userId in queries
});
```

---

## Security Considerations

### Authentication & Passwords
- ✅ Better-auth handles password hashing (bcrypt/argon2)
- ✅ HTTP-only cookies prevent XSS attacks
- ✅ Session tokens automatically rotated
- ✅ CSRF protection built into TanStack Start

### API Key Storage (Clockify)
- ✅ Encrypt at rest using AES-256-GCM
- ✅ Store encryption key in environment variable
- ✅ Never expose API keys in client-side code
- ✅ All Clockify API calls happen server-side

### Data Access & Isolation
- ✅ All queries must filter by `userId`
- ✅ Session validation on every server request
- ✅ Return 401 for unauthenticated requests
- ✅ Return 403 for unauthorized data access

---

## Implementation Phases

### Phase 1: Foundation & Authentication

**Already Complete:**
- ✅ Better-auth configured with email authentication
- ✅ Drizzle ORM set up with SQLite
- ✅ Better-auth schema tables created

**Remaining:**
- [ ] Build user registration/login UI
- [ ] Create `user_clockify_config` table schema
- [ ] Create setup wizard for Clockify integration
- [ ] Implement Clockify API key encryption

### Phase 2: Clockify Integration & Basic Display

- [ ] Implement Clockify API client
- [ ] Create weekly table component
- [ ] Fetch and display raw data (no caching yet)
- [ ] Basic date navigation
- [ ] Display daily sums for tracked projects
- [ ] Display weekly sum for all client projects
- [ ] Basic overtime calculation

### Phase 3: Configuration Management & Versioning

- [ ] Build config_chronic table and logic
- [ ] Create configuration UI (edit tracked projects, regular hours, client filter)
- [ ] Implement temporal queries
- [ ] Show configuration history to user
- [ ] Handle config changes (close old, create new records)

### Phase 4: Caching Layer & Optimization

- [ ] Implement caching tables
- [ ] Build cache calculation logic
- [ ] Implement cache invalidation
- [ ] Background job for cache warming
- [ ] Handle bulk historical recalculations

### Phase 5: Polish & Features

- [ ] Cumulative overtime tracking
- [ ] Multiple week views (monthly view)
- [ ] Export capabilities (CSV, PDF)
- [ ] Data visualization (charts, graphs)
- [ ] Mobile responsive design
- [ ] Error handling & retry logic
- [ ] Loading states & skeleton screens

---

## Technical Decisions

### ✅ SQLite + Drizzle ORM
- Simple deployment (single file database)
- No separate database server needed
- Excellent TypeScript support
- Easy backups
- See: [Decision: EventSourcingDB vs SQLite](decisions/2025_10_31_eventsourcingdb_vs_sqlite.md)

### ✅ Better-auth for Authentication
- Modern, TypeScript-first auth library
- Email authentication support
- Good integration with full-stack frameworks
- See: [Decision: Better-Auth Integration](decisions/2025_10_31_better_auth_integration.md)

### ✅ TanStack Query for Data Fetching
- Excellent caching built-in
- Automatic refetching and invalidation
- Great TypeScript support
- Perfect for API integration

### ✅ Temporal Tables for Configuration Versioning
- Perfect fit for configuration versioning needs
- Simple SQL queries with indexes
- Well-known pattern (Slowly Changing Dimension Type 2)
- No additional infrastructure required

### ❌ NOT Using Event Sourcing / EventSourcingDB
- Application doesn't generate domain events
- Data comes from external API
- Temporal tables solve the versioning problem
- See: [Decision: EventSourcingDB vs SQLite](decisions/2025_10_31_eventsourcingdb_vs_sqlite.md)

---

## Code Organization

```
src/
├── lib/
│   ├── auth/          # Better-auth configuration
│   ├── clockify/      # Clockify API client and encryption
│   ├── cache/         # Cache management logic
│   └── config/        # Configuration versioning logic
├── db/
│   ├── index.ts       # Drizzle instance
│   ├── schema/
│   │   ├── better-auth.ts    # Better-auth managed tables
│   │   ├── clockify.ts       # user_clockify_config
│   │   ├── config.ts         # config_chronic
│   │   └── cache.ts          # Cache tables
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

## Development Guidelines

### Naming Conventions
- Database tables: snake_case
- TypeScript: camelCase for variables, PascalCase for types/components
- Files: kebab-case for components, camelCase for utilities

### Commit Message Format
```
type(scope): description

Types: feat, fix, refactor, docs, test, chore
```

---

## References

### Decisions
- [EventSourcingDB vs SQLite](decisions/2025_10_31_eventsourcingdb_vs_sqlite.md)
- [Better-Auth Integration](decisions/2025_10_31_better_auth_integration.md)

### Documentation
- [Better-auth Docs](https://www.better-auth.com/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [TanStack Start Docs](https://tanstack.com/router/latest/docs/framework/react/start)
- [Clockify API Docs](https://clockify.me/developers-api)

---

_This document is a living document and should be updated as architectural decisions are made._
