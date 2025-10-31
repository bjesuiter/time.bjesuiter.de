# Decision: Client Filter and Tracked Projects

**Date**: 2025-10-31\
**Status**: ✅ Decided\
**Context**: Phase 3 - Configuration Management & Versioning

---

## Problem

The application needs to determine which time entries to include in weekly
overtime calculations. Users may work on multiple clients and projects, but only
want to track specific ones.

Two related questions:

1. **Client Filter**: Which client's work counts toward weekly hours and overtime?
2. **Tracked Projects**: Which specific projects should be shown in daily columns?

---

## Decision

**Use a single client filter with multiple tracked projects.**

### Client Filter (Single)

- User selects ONE client
- Weekly totals include ALL projects under this client
- Stored in `user_clockify_config` table
- Versioning NOT needed (changes are rare and don't affect historical data
  calculation)

### Tracked Projects (Multiple)

- User selects multiple projects to "track" (show in daily columns)
- Projects must belong to the selected client
- Stored in `config_chronic` table (versioned - affects historical views)
- Used for display/breakdown, not for total calculation

---

## Implementation Details

### 1. Database Schema

**Update `user_clockify_config` table:**

```typescript
{
  userId: string;
  clockifyApiKey: string;
  clockifyWorkspaceId: string;
  clockifyUserId: string;
  timeZone: string;
  weekStart: string;
  regularHoursPerWeek: number;
  workingDaysPerWeek: number;
  cumulativeOvertimeStartDate: date | null;
  selectedClientId: string | null;           // NEW: Single client
  selectedClientName: string | null;         // NEW: For display
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**Keep `config_chronic` table for tracked projects:**

```typescript
{
  id: string;
  userId: string;
  configType: enum('tracked_projects');      // Only one type now
  value: json;                                // { projectIds: string[], projectNames: string[] }
  validFrom: timestamp;
  validUntil: timestamp | null;
  createdAt: timestamp;
}
```

### 2. Configuration Logic

**Client Selection:**

```typescript
async function setSelectedClient(
  userId: string,
  clientId: string,
  clientName: string
) {
  await db
    .update(userClockifyConfig)
    .set({
      selectedClientId: clientId,
      selectedClientName: clientName,
      updatedAt: new Date(),
    })
    .where(eq(userClockifyConfig.userId, userId));

  // Client change doesn't invalidate cache (same calculation)
  // But user might want to refresh to see new client's data
}
```

**Tracked Projects Selection (Versioned):**

```typescript
async function setTrackedProjects(
  userId: string,
  projectIds: string[],
  projectNames: string[],
  validFrom: Date
) {
  // Close previous configuration
  await db
    .update(configChronic)
    .set({ validUntil: validFrom })
    .where(
      and(
        eq(configChronic.userId, userId),
        eq(configChronic.configType, "tracked_projects"),
        isNull(configChronic.validUntil)
      )
    );

  // Create new configuration
  await db.insert(configChronic).values({
    id: generateId(),
    userId,
    configType: "tracked_projects",
    value: { projectIds, projectNames },
    validFrom,
    validUntil: null,
    createdAt: new Date(),
  });

  // Invalidate cache from validFrom date forward
  await invalidateCacheFromDate(userId, validFrom);
}
```

### 3. Fetching Time Data from Clockify

**Fetch weekly data for selected client:**

```typescript
async function fetchWeeklyDataForClient(
  userId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<DailyProjectSums[]> {
  const config = await getUserConfig(userId);

  if (!config.selectedClientId) {
    throw new Error("No client selected");
  }

  // Call Clockify Reports API
  const response = await fetch(
    `https://reports.api.clockify.me/v1/workspaces/${config.clockifyWorkspaceId}/reports/summary`,
    {
      method: "POST",
      headers: {
        "X-Api-Key": config.clockifyApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRangeStart: weekStart.toISOString(),
        dateRangeEnd: weekEnd.toISOString(),
        summaryFilter: {
          groups: ["DATE", "PROJECT"], // Group by date AND project
        },
        clients: {
          ids: [config.selectedClientId],
          contains: "CONTAINS", // Only this client
        },
      }),
    }
  );

  const data = await response.json();

  // Process and return daily project sums
  return processDailySums(data);
}
```

### 4. Weekly Total Calculation

**Weekly total includes ALL client projects:**

```typescript
async function calculateWeeklyTotal(
  userId: string,
  weekStart: Date
): Promise<WeeklySum> {
  const config = await getUserConfig(userId);
  const dailySums = await fetchWeeklyDataForClient(userId, weekStart, weekEnd);

  // Sum ALL projects for the client (tracked + untracked)
  const totalSeconds = dailySums.reduce(
    (sum, day) => sum + day.totalSeconds,
    0
  );

  const expectedSeconds = config.regularHoursPerWeek * 3600;
  const overtimeSeconds = totalSeconds - expectedSeconds;

  return {
    weekStart,
    weekEnd,
    clientId: config.selectedClientId,
    totalSeconds,
    overtimeSeconds,
    // ... other fields
  };
}
```

---

## Rationale

### Why Single Client?

1. **User's Use Case**: Works for one primary client (Secunet)
2. **Overtime Context**: Overtime calculated against ONE employment contract
3. **Simplicity**: No need to aggregate multiple clients
4. **Future-Proof**: Can add multi-client support later if needed

### Why NOT Version Client Selection?

1. **Rare Changes**: Users rarely change employers
2. **No Historical Impact**: Changing client doesn't affect past calculations
   - Past data was for previous client (correct)
   - Future data is for new client (correct)
   - No need to recalculate with new client filter
3. **Simpler Logic**: Just store current value, no temporal queries
4. **Cache Friendly**: Client change doesn't invalidate cache

### Why Version Tracked Projects?

1. **Display Affects History**: User might want to see different projects for
   different time periods
2. **Project Changes**: Projects come and go (SMC 1.8 → SMC 1.9)
3. **Accurate Historical View**: Looking at October data should show October's
   tracked projects
4. **Cache Dependency**: Cached daily project sums depend on which projects were
   tracked

### Why Tracked Projects Must Belong to Selected Client?

1. **Data Consistency**: Can't track projects from Client B when viewing Client A's
   time
2. **API Efficiency**: Clockify query already filtered to one client
3. **User Intent**: Tracked projects are a subset of client's projects
4. **Validation**: UI can validate project selection against client's projects

---

## User Flow

### Initial Setup

1. User connects Clockify API
2. App fetches available clients
3. User selects primary client: "Secunet"
4. App fetches client's projects
5. User selects tracked projects: ["SMC 1.8", "Internal Time"]
6. Configurations saved

### Changing Client (Rare)

1. User goes to Settings
2. Clicks "Change Client"
3. Selects new client
4. App clears tracked projects (old projects don't belong to new client)
5. User must select new tracked projects
6. No cache invalidation needed

### Changing Tracked Projects (Common)

1. User goes to Settings
2. Clicks "Edit Tracked Projects"
3. Selects new projects: ["SMC 1.9", "Internal Time"]
4. Sets effective date: "2025-11-01"
5. App creates new versioned config
6. Cache invalidated from 2025-11-01 forward

### Viewing Historical Data

User viewing week of 2025-10-07:

```typescript
// Query for tracked projects active on 2025-10-07
const trackedProjects = await db.query.configChronic.findFirst({
  where: and(
    eq(configChronic.userId, userId),
    eq(configChronic.configType, "tracked_projects"),
    lte(configChronic.validFrom, "2025-10-07"),
    or(
      isNull(configChronic.validUntil),
      gt(configChronic.validUntil, "2025-10-07")
    )
  ),
});

// Result: { projectIds: ["SMC 1.8", "Internal Time"] }
// Display shows projects that were tracked in October
```

---

## User Interface

### Settings Page

```
┌─────────────────────────────────────────────────────────────┐
│ Client & Project Configuration                              │
├─────────────────────────────────────────────────────────────┤
│ Selected Client:                                            │
│ [Secunet ▼]  (Change Client)                               │
│                                                             │
│ Tracked Projects:                                           │
│ ☑ SMC 1.9                                                   │
│ ☑ Internal Time                                             │
│ ☐ Administration                                            │
│ ☐ Recruiting                                                │
│                                                             │
│ Apply changes from: [📅 2025-11-01]                        │
│                                                             │
│ [ Save Changes ]                                            │
│                                                             │
│ Note: Changing tracked projects will recalculate data       │
│       from the selected date forward.                       │
└─────────────────────────────────────────────────────────────┘
```

### Configuration History

```
┌─────────────────────────────────────────────────────────────┐
│ Tracked Projects History                                    │
├─────────────────────────────────────────────────────────────┤
│ Current (from 2025-11-01):                                  │
│   • SMC 1.9                                                 │
│   • Internal Time                                           │
│                                                             │
│ Previous (2025-10-01 to 2025-10-31):                       │
│   • SMC 1.8                                                 │
│   • Internal Time                                           │
│                                                             │
│ [ View Full History ]                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Examples

### Example 1: Normal Configuration

**Setup:**

- Client: "Secunet"
- Tracked projects: ["SMC 1.9", "Internal Time"]
- User also works on: "Administration", "Recruiting" (same client)

**Weekly calculation:**

- SMC 1.9: 15h
- Internal Time: 5h
- Administration: 3h
- Recruiting: 2h
- **Total: 25h** (ALL client projects count)

**Display:**

- Shows detailed breakdown for SMC 1.9 and Internal Time
- Shows "Extra Work" row for Administration + Recruiting (5h)
- Shows total row (25h)

### Example 2: Changing Tracked Projects Mid-Month

**October 1-20:**

- Tracked: ["SMC 1.8"]
- Config valid from: 2025-10-01

**October 21 onwards:**

- Tracked: ["SMC 1.9"]
- Config valid from: 2025-10-21

**Viewing week Oct 14-20:**

- Query uses config valid on Oct 14
- Shows SMC 1.8 in breakdown

**Viewing week Oct 21-27:**

- Query uses config valid on Oct 21
- Shows SMC 1.9 in breakdown

### Example 3: Changing Client (New Job)

**Before (2025-01 to 2025-09):**

- Client: "Previous Company"
- Tracked: ["Project Alpha"]

**After (2025-10 onwards):**

- Client: "Secunet"
- Tracked: ["SMC 1.8"]

**Viewing old data (August):**

- Shows "Previous Company" data
- Shows "Project Alpha" in breakdown
- Overtime calculated correctly for August

**Viewing new data (October):**

- Shows "Secunet" data
- Shows "SMC 1.8" in breakdown
- Overtime calculated correctly for October

**No cache invalidation needed** - Historical data for old client is still correct.

---

## Alternatives Considered

### Option 1: Multiple Clients (Rejected)

- Track multiple clients simultaneously
- ❌ User's use case is single-client employment
- ❌ More complex UI and logic
- ❌ Unclear which client's projects to show
- ❌ Overtime against what baseline?

### Option 2: Version Client Selection (Rejected)

- Store client in `config_chronic` with temporal validity
- ❌ Overkill for rare changes
- ❌ Client change doesn't affect historical calculations
- ❌ More complex queries for no benefit

### Option 3: No Client Filter (Rejected)

- Include ALL time entries regardless of client
- ❌ User might have side projects that shouldn't count
- ❌ Less accurate overtime tracking
- ❌ Can't focus on employment hours only

### Option 4: Store Project Names in `user_clockify_config` (Rejected)

- Non-versioned tracked projects
- ❌ Can't view historical data with correct project breakdown
- ❌ Changing projects affects past views incorrectly
- ❌ No audit trail of project changes

---

## Consequences

### Positive

- ✅ Simple single-client model matches user's use case
- ✅ Tracked projects versioned for accurate historical views
- ✅ Client changes don't invalidate cache (efficient)
- ✅ Clear separation: client (current) vs. projects (versioned)
- ✅ Can add multi-client support later without schema changes

### Negative

- ⚠️ Can only track one client at a time
- ⚠️ Changing client loses tracked project selection
- ⚠️ Need validation to ensure tracked projects belong to client

### Neutral

- 🔵 Two columns added to `user_clockify_config`
- 🔵 `config_chronic` only stores `tracked_projects` type now
- 🔵 No need for `regular_hours` or `client_filter` in `config_chronic`

---

## Migration

```sql
-- Add client columns to user_clockify_config
ALTER TABLE user_clockify_config
ADD COLUMN selectedClientId TEXT;

ALTER TABLE user_clockify_config
ADD COLUMN selectedClientName TEXT;

-- Update config_chronic table (no changes needed, already supports tracked_projects)
-- Remove unused configType values if any were created during planning
DELETE FROM config_chronic
WHERE configType IN ('regular_hours', 'client_filter');
```

---

## Testing Considerations

Test cases needed:

1. ✅ Setting client saves to user_clockify_config
2. ✅ Changing client clears tracked projects
3. ✅ Setting tracked projects creates versioned config
4. ✅ Changing tracked projects closes old config, creates new one
5. ✅ Historical query returns correct projects for given date
6. ✅ Weekly total includes ALL client projects (tracked + untracked)
7. ✅ Validation: Can't select projects from different client
8. ✅ Client change doesn't invalidate cache
9. ✅ Tracked project change invalidates cache from validFrom date
10. ✅ Viewing historical week uses correct project configuration

---

## Future Enhancements (Out of Scope)

### Multi-Client Support

If user needs to track multiple clients:

```typescript
{
  selectedClients: [
    { clientId: "client_a", clientName: "Secunet" },
    { clientId: "client_b", clientName: "Side Project" }
  ]
}
```

- Aggregate time across all selected clients
- UI shows breakdown by client
- Configuration becomes more complex

### Client-Specific Tracked Projects

Different tracked projects per client:

```typescript
{
  configType: 'tracked_projects',
  value: {
    clientId: "client_a",
    projectIds: ["project_1", "project_2"]
  }
}
```

- Useful if tracking multiple clients
- More complex queries and UI

### Auto-Detect Main Client

Analyze Clockify data to suggest main client:

- Find client with most hours
- Offer as default selection
- Speeds up initial setup

---

## References

- [ARCHITECTURE.md - Database Schema](../ARCHITECTURE.md#database-schema)
- [ARCHITECTURE.md - Configuration Versioning](../ARCHITECTURE.md#configuration-versioning-strategy)
- [Decision: Cumulative Overtime Tracking](2025_10_31_cumulative_overtime_tracking.md)
- [Decision: Cache Invalidation and Week Commitment](2025_10_31_cache_invalidation_and_week_commitment.md)

