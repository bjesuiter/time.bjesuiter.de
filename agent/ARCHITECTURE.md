# Architecture Documentation

## Overview

This document outlines the technical architecture for the time tracking
dashboard that integrates with Clockify. The system provides weekly time
summaries with configurable project tracking and automated overtime
calculations.

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

## Data Architecture

### Database Schema

#### 1. `accounts` Table

Stores user credentials and Clockify workspace association.

```typescript
{
  id: string (primary key),
  email: string (unique),
  passwordHash: string,
  clockifyApiKey: string (encrypted),
  clockifyWorkspaceId: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 2. `config_chronic` Table

Versioned configuration tracking (chronicle) containing both current and
historical configurations.

```typescript
{
  id: string (primary key),
  accountId: string (foreign key),
  configType: enum('tracked_projects', 'regular_hours', 'client_filter'),
  value: json, // Flexible storage for different config types
  validFrom: timestamp, // When this config became active
  validUntil: timestamp | null, // null = current config
  createdAt: timestamp
}
```

**Config Type Values:**

- `tracked_projects`: `{ projectIds: string[] }` - Projects shown in daily
  columns
- `regular_hours`: `{ hoursPerWeek: number }` - Baseline for overtime
  calculation
- `client_filter`: `{ clientId: string, clientName: string }` - Client for
  weekly totals

#### 3. `cached_daily_project_sums` Table

Pre-calculated daily totals for selected/tracked projects only.

```typescript
{
  id: string (primary key),
  accountId: string (foreign key),
  date: date (YYYY-MM-DD),
  projectIds: json (array), // Which projects were summed
  totalSeconds: number,
  configSnapshotId: string, // Reference to config_chronic
  calculatedAt: timestamp,
  invalidatedAt: timestamp | null
}
```

#### 4. `cached_daily_client_sums` Table

Pre-calculated daily totals for entire client (all projects under client).

```typescript
{
  id: string (primary key),
  accountId: string (foreign key),
  date: date (YYYY-MM-DD),
  clientId: string,
  totalSeconds: number,
  calculatedAt: timestamp,
  invalidatedAt: timestamp | null
}
```

#### 5. `cached_weekly_sums` Table

Pre-calculated weekly totals and overtime.

```typescript
{
  id: string (primary key),
  accountId: string (foreign key),
  weekStart: date (Monday of the week),
  weekEnd: date (Sunday of the week),
  clientId: string,
  totalSeconds: number,
  regularHoursBaseline: number, // Hours per week baseline
  overtimeSeconds: number, // Calculated: totalSeconds - (regularHoursBaseline * 3600)
  cumulativeOvertimeSeconds: number, // Running total
  configSnapshotId: string,
  calculatedAt: timestamp,
  invalidatedAt: timestamp | null
}
```

---

## Clockify API Integration

### Authentication & User Info

**Endpoint**: `GET https://api.clockify.me/api/v1/user`

**Headers**:

```
X-Api-Key: {user's_clockify_api_key}
```

**Purpose**:

- Validate API key during setup
- Get user profile information
- List available workspaces for selection

**Response** (relevant fields):

```json
{
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "profilePicture": "url",
    "activeWorkspace": "workspace_id",
    "defaultWorkspace": "workspace_id",
    "workspaces": [
        {
            "id": "workspace_id",
            "name": "Workspace Name"
        }
    ]
}
```

### Time Reports Summary

**Endpoint**:
`POST https://reports.api.clockify.me/v1/workspaces/{workspaceId}/reports/summary`

**Headers**:

```
X-Api-Key: {user's_clockify_api_key}
Content-Type: application/json
```

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
        "contains": "CONTAINS",
        "status": "ALL"
    },
    "projects": {
        "ids": ["project_id_1", "project_id_2"],
        "contains": "CONTAINS",
        "status": "ALL"
    }
}
```

**Purpose**:

- Fetch time summaries grouped by date and project
- Filter by client for weekly totals
- Filter by specific projects for daily columns

---

## Configuration Versioning Strategy

### Problem

We need to know historical configuration values to accurately display past data
and calculate overtime correctly.

**Questions the system must answer:**

- "What projects were tracked on 2025-09-15?"
- "What was the regular hours baseline on 2025-08-01?"
- "Which client was used for overtime calculation in July 2025?"

### Solution: Temporal Configuration Table

Using `config_chronic` table with `validFrom` and `validUntil` timestamps:

**Example Workflow:**

1. User initially sets tracked projects to `["SMC 1.8"]` on 2025-10-01
   ```
   configType: 'tracked_projects'
   value: { projectIds: ["project_id_smc18"] }
   validFrom: 2025-10-01T00:00:00Z
   validUntil: null
   ```

2. User updates to `["SMC 1.9"]` on 2025-11-01
   - Previous record updated: `validUntil: 2025-11-01T00:00:00Z`
   - New record created:
   ```
   configType: 'tracked_projects'
   value: { projectIds: ["project_id_smc19"] }
   validFrom: 2025-11-01T00:00:00Z
   validUntil: null
   ```

**Query Pattern:**

```sql
SELECT * FROM config_chronic
WHERE accountId = ?
  AND configType = 'tracked_projects'
  AND validFrom <= '2025-10-15'
  AND (validUntil IS NULL OR validUntil > '2025-10-15')
```

---

## Cache Invalidation Strategy

### When to Invalidate

**Trigger Events:**

1. **Configuration Change**
   - Invalidate all cached data from `validFrom` date forward
   - Set `invalidatedAt` timestamp on affected records

2. **Manual Refresh**
   - User requests fresh data from Clockify
   - Invalidate specific date range

3. **New Time Entries**
   - Could use webhooks (if available)
   - Or: Invalidate "recent" dates (last 7-14 days) periodically

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

## Research TODOs

### 1. Configuration Versioning Approaches

**Status**: ✅ **DECIDED** - Temporal Tables

**Decision**: Use temporal tables with `validFrom`/`validUntil` timestamps in SQLite.

**Rationale:**

- ✅ Perfect fit for configuration versioning needs
- ✅ Simple SQL queries to get config at any point in time
- ✅ Well-known pattern (Slowly Changing Dimension Type 2)
- ✅ No additional infrastructure required
- ✅ Works seamlessly with Drizzle ORM
- ✅ Excellent query performance with proper indexing

**Alternatives Considered:**

- ❌ **Event Sourcing / EventSourcingDB**: Overkill for this use case (see research)
- ❌ **Simple Versioning**: Less powerful than temporal tables
- ✅ **Temporal Tables**: **SELECTED** - Simple, efficient, proven

**Research**: See `RESEARCH-EventSourcingDB-vs-SQLite.md` for detailed analysis

---

### 2. Event Sourcing Pattern for Calculation Management

**Status**: ✅ **DECIDED** - NOT Using Event Sourcing

**Decision**: Use timestamp-based cache invalidation with regular tables.

**Rationale:**

- ❌ Application doesn't generate domain events
- ❌ Data comes from external API (Clockify), not internal commands
- ❌ Cache invalidation is computational, not event-driven
- ❌ No need to replay events or rebuild state
- ❌ Event sourcing adds significant complexity without benefits
- ✅ Simple `invalidatedAt` timestamp approach is sufficient
- ✅ Standard cache tables with indexes provide excellent performance

**Why Event Sourcing Doesn't Fit:**

- No event-driven workflows or sagas
- No complex domain logic requiring state reconstruction
- Calculations are deterministic from Clockify API data
- No audit requirements for calculation history

**Research**: See `RESEARCH-EventSourcingDB-vs-SQLite.md` for detailed analysis

---

### 3. EventSourcingDB from Thenativeweb

**Status**: ✅ **DECIDED** - NOT Using EventSourcingDB

**Product**: https://docs.eventsourcingdb.io/

**Decision**: Continue with SQLite + Drizzle ORM. Do NOT adopt EventSourcingDB.

**Research Findings:**

- ❌ **Separate database server** - Requires Docker, HTTP API, operational overhead
- ❌ **Wrong abstraction** - Application doesn't fit event sourcing patterns
- ❌ **Very new product** - Released 2025, v1.5.0, only 26 GitHub stars
- ❌ **No integration** - Incompatible with Better-auth and Drizzle ORM
- ❌ **Unnecessary complexity** - Would require complete data layer rewrite
- ❌ **Operational overhead** - Additional service to monitor, backup, maintain

**Why SQLite is Better for This Application:**

- ✅ Embedded (no separate service)
- ✅ Zero operational overhead
- ✅ Perfect integration with existing stack
- ✅ Mature and battle-tested (23+ years)
- ✅ Temporal tables handle versioning perfectly
- ✅ Fast local queries vs HTTP API calls

**Conclusion**: EventSourcingDB solves problems we don't have. SQLite + temporal tables is the correct choice.

**Research**: See `RESEARCH-EventSourcingDB-vs-SQLite.md` for comprehensive 40-page analysis

---

### 4. Cache Invalidation Strategy Deep Dive

**Status**: 🔍 Research Phase

**Current Approach**: Timestamp-based invalidation with `invalidatedAt` field

**Questions:**

- Should we use Clockify webhooks for real-time invalidation?
- What's the optimal invalidation window? (7 days? 14 days?)
- Should we invalidate proactively or lazily?
- How to handle bulk recalculations efficiently?

**Scenarios to Test:**

- User changes config affecting 6 months of historical data
- User adds time entries to past dates
- Multiple config changes in short succession

**Optimization Ideas:**

- Background job for cache warming
- Incremental recalculation
- Priority queue (recent dates first)

---

### 5. Clockify API Rate Limiting & Optimization

**Status**: 🔍 Research Phase

**Questions:**

- What are Clockify's rate limits?
- Should we batch API requests?
- Can we use summary API to reduce calls?
- Should we implement request queuing?

**Strategy:**

- Always use cached data when available
- Fetch only invalidated date ranges
- Consider batch fetching for historical data

---

## Implementation Phases

### Phase 1: Foundation & Authentication

**Goal**: Basic app with auth and setup flow

- [ ] Set up Better-auth with email authentication
- [ ] Create database schema with Drizzle
- [ ] Build user registration/login flow
- [ ] Create setup wizard for Clockify integration
  - [ ] API key input
  - [ ] Workspace selection (fetch from Clockify)
  - [ ] Initial configuration (client, projects, regular hours)
- [ ] Store encrypted Clockify API key

**Deliverable**: Users can sign up, log in, and connect their Clockify account

---

### Phase 2: Clockify Integration & Basic Display

**Goal**: Show time data from Clockify

- [ ] Implement Clockify API client
  - [ ] User info endpoint
  - [ ] Summary reports endpoint
- [ ] Create weekly table component
- [ ] Fetch and display raw data (no caching yet)
- [ ] Basic date navigation (prev/next week)
- [ ] Display daily sums for tracked projects
- [ ] Display weekly sum for all client projects
- [ ] Basic overtime calculation

**Deliverable**: Functional dashboard showing weekly time data

---

### Phase 3: Configuration Management & Versioning

**Goal**: Implement temporal configuration system

- [ ] Build config_chronic table and logic
- [ ] Create configuration UI
  - [ ] Edit tracked projects
  - [ ] Edit regular hours baseline
  - [ ] Edit client filter
- [ ] Implement temporal queries (config at date X)
- [ ] Show configuration history to user
- [ ] Handle config changes (close old, create new records)

**Deliverable**: Users can change configs without losing historical context

---

### Phase 4: Caching Layer & Optimization

**Goal**: Pre-calculate and cache time summaries

- [ ] Implement caching tables
- [ ] Build cache calculation logic
  - [ ] Daily project sums
  - [ ] Daily client sums
  - [ ] Weekly sums
- [ ] Implement cache invalidation
- [ ] Background job for cache warming
- [ ] Performance monitoring
- [ ] Handle bulk historical recalculations

**Research Decision Applied**: Using timestamp-based cache invalidation with `invalidatedAt` field (NOT event sourcing)

**Deliverable**: Fast dashboard with minimal API calls

---

### Phase 5: Polish & Features

**Goal**: Production-ready application

- [ ] Cumulative overtime tracking
- [ ] Multiple week views (monthly view)
- [ ] Export capabilities (CSV, PDF)
- [ ] Data visualization (charts, graphs)
- [ ] Mobile responsive design
- [ ] Error handling & retry logic
- [ ] Loading states & skeleton screens
- [ ] Offline support (PWA)

**Deliverable**: Production-ready application

---

## Technical Decisions Log

### Decision 1: SQLite + Drizzle

**Status**: ✅ Decided

**Rationale**:

- Simple deployment (single file database)
- No separate database server needed
- Drizzle provides excellent TypeScript support
- Sufficient for single-user application
- Easy backups

**Trade-offs**:

- Not suitable for multi-user concurrent access (not a concern for this app)
- Limited to local deployment (acceptable)

---

### Decision 2: Better-auth for Authentication

**Status**: ✅ Decided

**Rationale**:

- Modern, TypeScript-first auth library
- Email authentication support
- Good integration with full-stack frameworks
- Active development

**Trade-offs**:

- Newer library (less battle-tested than Auth.js)
- Smaller community

**Alternative Considered**: Auth.js (NextAuth)

---

### Decision 3: TanStack Query for Data Fetching

**Status**: ✅ Decided (Included in initial setup)

**Rationale**:

- Excellent caching built-in
- Automatic refetching and invalidation
- Great TypeScript support
- Perfect for API integration

---

## Security Considerations

### API Key Storage

- **Requirement**: Store Clockify API key securely
- **Solution**: Encrypt at rest in database
- **Implementation**:
  - Use `crypto` module for encryption
  - Store encryption key in environment variable
  - Never expose API key in client-side code

### Authentication

- **Email-based authentication** with Better-auth
- **Session management** with secure HTTP-only cookies
- **CSRF protection** built into TanStack Start

### Data Access

- All Clockify API calls happen server-side
- User can only access their own data
- Account-level data isolation in database queries

---

## Monitoring & Observability

### Logging Strategy

- Log all Clockify API calls (timing, success/failure)
- Log cache hits/misses
- Log configuration changes
- Error logging with stack traces

### Metrics to Track

- API response times
- Cache hit rate
- Calculation times
- User session duration

### Debugging Tools

- Config history viewer
- Cache invalidation history
- API call log viewer

---

## Future Enhancements

### Nice-to-Have Features

- [ ] Multiple client tracking
- [ ] Team dashboards
- [ ] Notifications for overtime thresholds
- [ ] Integration with calendar apps
- [ ] Predictive overtime calculations
- [ ] Budget tracking per project
- [ ] Invoice generation based on tracked time
- [ ] Dark mode
- [ ] Custom week start day (Monday vs Sunday)

### Scalability Considerations

- If multi-user: Migrate to PostgreSQL
- If high traffic: Add Redis caching layer
- If complex queries: Consider read replicas

---

## Questions for Future Discussion

1. **Data Retention**: How long should we keep cached data?
2. **Backup Strategy**: How often to backup SQLite database?
3. **Multi-Device**: Should config sync across devices?
4. **Clockify Changes**: How to handle Clockify API changes?
5. **Testing**: What level of test coverage is needed?
6. **Deployment**: Self-hosted vs cloud deployment?

---

## Development Guidelines

### Code Organization

```
src/
├── lib/
│   ├── auth/          # Better-auth configuration
│   ├── db/            # Drizzle schema and migrations
│   ├── clockify/      # Clockify API client
│   ├── cache/         # Cache management logic
│   └── config/        # Configuration versioning logic
├── routes/            # TanStack Start routes
├── components/        # React components
└── types/             # TypeScript types
```

### Naming Conventions

- Database tables: snake_case
- TypeScript: camelCase for variables, PascalCase for types/components
- Files: kebab-case for components, camelCase for utilities

### Commit Message Format

```
type(scope): description

- feat: New feature
- fix: Bug fix
- refactor: Code refactoring
- docs: Documentation updates
- test: Test additions/updates
- chore: Maintenance tasks
```

---

_This document is a living document and should be updated as architectural
decisions are made and research TODOs are resolved._
