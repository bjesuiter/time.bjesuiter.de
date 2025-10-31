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
  clockifyApiKey: string                         // Plain text (personal project)
  clockifyWorkspaceId: string
  clockifyUserId: string
  timeZone: string                               // From Clockify user settings
  weekStart: string                              // "MONDAY" | "SUNDAY"
  selectedClientId: string | null                // Single client filter
  selectedClientName: string | null
  regularHoursPerWeek: number                    // e.g., 25 or 40
  workingDaysPerWeek: number                     // e.g., 5 (Mon-Fri)
  cumulativeOvertimeStartDate: date | null       // e.g., "2025-10-01"
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
  configType: enum('tracked_projects')           // Only tracked projects versioned
  value: json                                     // { projectIds: string[], projectNames: string[] }
  validFrom: timestamp                            // When this config became active
  validUntil: timestamp | null                    // null = current config
  createdAt: timestamp
}
```

**Config Type Values:**
- `tracked_projects`: `{ projectIds: string[], projectNames: string[] }` - Projects shown in detail in weekly breakdown

**Note:** Regular hours and client filter are NOT versioned - stored in `user_clockify_config` instead.

**7. `cached_daily_project_sums`** - Pre-calculated daily project totals

```typescript
{
  id: string (primary key)
  userId: string (foreign key -> user.id)
  date: date (YYYY-MM-DD)
  projectId: string                               // Individual project
  projectName: string
  seconds: number
  clientId: string
  calculatedAt: timestamp
  invalidatedAt: timestamp | null
}
```

**Note:** Daily sums are stored per-project for flexible breakdown. Weekly aggregation happens on-demand.

**8. `cached_weekly_sums`** - Pre-calculated weekly totals and overtime

```typescript
{
  id: string (primary key)
  userId: string (foreign key -> user.id)
  weekStart: date (Monday or Sunday, per user setting)
  weekEnd: date (Sunday or Saturday)
  clientId: string
  totalSeconds: number
  regularHoursBaseline: number
  overtimeSeconds: number
  cumulativeOvertimeSeconds: number
  configSnapshotId: string
  status: enum('pending', 'committed')            // Week commitment status
  committedAt: timestamp | null
  calculatedAt: timestamp
  invalidatedAt: timestamp | null
}
```

**9. `weekly_discrepancies`** - Tracks changes to committed weeks

```typescript
{
  id: string (primary key)
  userId: string (foreign key -> user.id)
  weekStart: date
  weekEnd: date
  detectedAt: timestamp
  oldTotalSeconds: number
  newTotalSeconds: number
  oldOvertimeSeconds: number
  newOvertimeSeconds: number
  differenceTotalSeconds: number
  differenceOvertimeSeconds: number
  acknowledged: boolean
  acknowledgedAt: timestamp | null
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

**Decision**: Week commitment system with status-based refresh. See [Decision: Cache Invalidation and Week Commitment](decisions/2025_10_31_cache_invalidation_and_week_commitment.md)

### Week Commitment Model

Each week has a status:
- **Pending**: Active, auto-refreshes on page load
- **Committed**: Frozen, never auto-refreshes (manual only)

### When to Refresh

| Week Status | Page Load | Manual Refresh | Discrepancy Tracking |
|-------------|-----------|----------------|---------------------|
| Pending     | ✅ Yes    | ✅ Yes         | ❌ No               |
| Committed   | ❌ No     | ✅ Yes         | ✅ Yes              |

**Refresh Triggers:**
1. **Page Load** - Refresh all pending (uncommitted) weeks
2. **Manual Per-Week** - "Refetch & Recalculate" button for any week
3. **Annual Refresh** - Settings button to refresh from January 1st
4. **Configuration Change** - Invalidate all weeks from `validFrom` date forward

### Discrepancy Tracking

When a committed week is manually refreshed:
- If data changed → Log to `weekly_discrepancies` table
- Show warning to user (already reported to work systems!)
- User must acknowledge the discrepancy

### Cache Lookup Flow

```
1. Check cached_weekly_sums for week
   ├─ Found & status='pending'? → Refresh from Clockify
   ├─ Found & status='committed'? → Use cached (don't refresh)
   └─ Not found? → Fetch from Clockify, cache as 'pending'

2. Check cached_daily_project_sums for breakdown
   ├─ Found & not invalidated? → Use cached value
   └─ Not found or invalidated? → Fetch from Clockify, cache
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
- ✅ **Plain text storage** (personal project, simplified approach)
- ✅ Server-side only access (never exposed to client)
- ✅ All Clockify API calls happen server-side
- ⚠️ Database file protected by filesystem permissions
- 📝 See [Decision: Clockify API Key Storage](decisions/2025_10_31_clockify_api_key_storage.md)

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
- [ ] Fetch timezone and weekStart from Clockify `/v1/user` endpoint

### Phase 2: Clockify Integration & Basic Display

- [ ] Implement Clockify API client
- [ ] Fetch daily summaries (grouped by DATE and PROJECT)
- [ ] Create multi-row weekly table component (tracked projects + extra work + total)
- [ ] Month-based navigation (current month + previous week)
- [ ] Display daily sums for tracked projects
- [ ] Display "Extra Work" row for untracked projects
- [ ] Display total row for all client projects
- [ ] Daily-based overtime calculation (working days vs. weekends)

### Phase 3: Configuration Management & Versioning

- [ ] Build config_chronic table and logic (tracked projects only)
- [ ] Create configuration UI:
  - [ ] Select client (single, stored in user_clockify_config)
  - [ ] Select tracked projects (multiple, versioned in config_chronic)
  - [ ] Set regular hours per week
  - [ ] Set working days per week
  - [ ] Set cumulative overtime start date
- [ ] Implement temporal queries for tracked projects
- [ ] Show configuration history to user
- [ ] Handle config changes (close old, create new records)
- [ ] Manual refresh button for Clockify settings (timezone, weekStart)

### Phase 4: Caching Layer & Optimization

- [ ] Implement caching tables (cached_daily_project_sums, cached_weekly_sums)
- [ ] Build cache calculation logic
- [ ] Implement week commitment system:
  - [ ] Commit/uncommit week actions
  - [ ] Status-based refresh logic
  - [ ] Per-week "Refetch & Recalculate" button
- [ ] Implement discrepancy tracking:
  - [ ] weekly_discrepancies table
  - [ ] Detect changes to committed weeks
  - [ ] Show warnings in UI
- [ ] Settings page: "Refresh from January 1st" button
- [ ] Handle configuration change invalidation

### Phase 5: Polish & Features

- [ ] Cumulative overtime display
- [ ] Extra work tooltip/expandable detail (show which projects)
- [ ] Export capabilities (CSV, PDF)
- [ ] Data visualization (charts, graphs)
- [ ] Mobile responsive design
- [ ] Error handling & retry logic
- [ ] Loading states & skeleton screens
- [ ] Discrepancy UI (warning banner, detailed view)

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
- [Clockify API Key Storage](decisions/2025_10_31_clockify_api_key_storage.md)
- [Timezone and Week Boundaries](decisions/2025_10_31_timezone_and_week_boundaries.md)
- [Cumulative Overtime Tracking](decisions/2025_10_31_cumulative_overtime_tracking.md)
- [Cache Invalidation and Week Commitment](decisions/2025_10_31_cache_invalidation_and_week_commitment.md)
- [Client Filter and Tracked Projects](decisions/2025_10_31_client_filter_and_tracked_projects.md)
- [Weekly Table Layout](decisions/2025_10_31_weekly_table_layout.md)
- [Initial Data Fetch Scope](decisions/2025_10_31_initial_data_fetch_scope.md)

### Documentation
- [Better-auth Docs](https://www.better-auth.com/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [TanStack Start Docs](https://tanstack.com/router/latest/docs/framework/react/start)
- [Clockify API Docs](https://clockify.me/developers-api)

---

_This document is a living document and should be updated as architectural decisions are made._
