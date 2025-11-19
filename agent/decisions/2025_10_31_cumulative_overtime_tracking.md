# Decision: Cumulative Overtime Tracking

**Date**: 2025-10-31\
**Status**: ✅ Decided\
**Context**: Phase 2 & 3 - Configuration Management & Overtime Calculations

---

## Problem

The application tracks weekly overtime (actual hours vs. regular hours
baseline), but also needs to track **cumulative overtime** - the running total
across all weeks.

Key questions:

1. When does cumulative tracking begin?
2. Should users be able to set an initial overtime balance?
3. Should there be reset mechanisms (annual, manual, etc.)?
4. Where should the start date be stored?

---

## Decision

**Use a user-defined cumulative overtime start date, beginning at 0 hours, with
no automatic reset mechanism.**

### Implementation Details

1. **Add to `user_clockify_config` table:**

   ```typescript
   {
     userId: string;
     clockifyApiKey: string;
     clockifyWorkspaceId: string;
     clockifyUserId: string;
     timeZone: string;
     weekStart: string;
     regularHoursPerWeek: number; // NEW: e.g., 25 or 40
     workingDaysPerWeek: number; // NEW: e.g., 5 (Mon-Fri)
     cumulativeOvertimeStartDate: date | null; // NEW: e.g., "2025-10-01"
     createdAt: timestamp;
     updatedAt: timestamp;
   }
   ```

2. **Calculation logic:**
   - If `cumulativeOvertimeStartDate` is NULL → Don't calculate cumulative
     overtime
   - If set → Calculate cumulative overtime from that date forward
   - Always starts at 0 hours on the start date
   - Each week adds/subtracts from running total
   - **Daily-based calculation:**
     - Fetch daily time entries from Clockify
     - Expected hours per working day =
       `regularHoursPerWeek / workingDaysPerWeek`
     - Weekends (non-working days) have 0h expected
     - Weekend work counts as actual hours (increases weekly total)
     - Overtime = (sum of actual hours for week) - (expected hours for working
       days)

3. **Example calculation:**

   ```
   User settings:
   - cumulativeOvertimeStartDate = "2025-10-01" (Wednesday)
   - regularHoursPerWeek = 25h
   - workingDaysPerWeek = 5 (Mon-Fri)
   - Expected per working day = 25h / 5 = 5h/day

   Week 2025-09-30 (Mon) to 2025-10-05 (Sun):
   - Mon 09-30: NOT INCLUDED (before start date)
   - Tue 10-01: NOT INCLUDED (before start date)
   - Wed 10-01: 6h actual - 5h expected = +1h
   - Thu 10-02: 5h actual - 5h expected = 0h
   - Fri 10-03: 4h actual - 5h expected = -1h
   - Sat 10-04: 2h actual - 0h expected = +2h
   - Sun 10-05: 0h actual - 0h expected = 0h
   Week total: 17h actual - 15h expected = +2h → Cumulative: +2h

   Week 2025-10-07 to 2025-10-13:
   - Actual: 23h, Expected: 25h (5 days × 5h)
   - Overtime: -2h → Cumulative: 0h

   Week 2025-10-14 to 2025-10-20:
   - Actual: 28h, Expected: 25h
   - Overtime: +3h → Cumulative: +3h
   ```

4. **Clockify API data fetching:**
   - Fetch **daily summaries** from Clockify (not just weekly totals)
   - Use Clockify Reports API grouped by DATE
   - Calculate expected hours per day based on day of week (Mon-Fri = expected,
     Sat-Sun = 0)
   - Sum actual vs. expected for the week to get overtime

5. **User interface:**
   - Settings page: "Start tracking cumulative overtime from: [date picker]"
   - Can be set during initial setup or changed later
   - Changing the date triggers recalculation of all cached weekly sums

---

## Rationale

### Why User-Defined Start Date?

1. **Flexibility**: Different users may start at different times (employment
   start, project start, fiscal year, etc.)
2. **Historical Data Handling**: Allows ignoring time entries before employment
3. **Personal Context**: User's specific example: started at company on
   2025-10-01
4. **Clean Baseline**: Clear moment when overtime tracking begins

### Why Start at 0 Hours?

1. **Simplicity**: No need to manage initial balance input
2. **Accurate Accounting**: Cumulative overtime reflects actual tracked period
3. **Use Case**: User is doing personal overtime equalization, not migrating
   from another system
4. **Can Add Later**: If needed, can add "initial balance" feature later

### Why No Reset Mechanism?

1. **User Requirement**: No workplace overtime tracking, this is for personal
   equalization
2. **Long-Term Tracking**: User wants to see total accumulated overtime
3. **Flexibility**: Can always manually change start date to "reset"
4. **Future-Proof**: Can add reset features later if needed

### Why Store in `user_clockify_config`?

1. **User-Specific**: Different users may have different start dates
2. **Related Configuration**: Already stores other time-tracking preferences
3. **Single Source**: One table for all Clockify-related user config
4. **Migration-Friendly**: Easy to add to existing table

---

## User Flow

### Initial Setup

1. During Clockify setup wizard, user sees:

   ```
   ┌─────────────────────────────────────────────┐
   │ Cumulative Overtime Tracking (Optional)     │
   ├─────────────────────────────────────────────┤
   │ Start tracking cumulative overtime from:    │
   │ [📅 Select date...     ]  or  [ Skip ]     │
   │                                             │
   │ Your overtime will accumulate from this     │
   │ date forward, starting at 0 hours.          │
   └─────────────────────────────────────────────┘
   ```

2. If user selects a date → Stored in `cumulativeOvertimeStartDate`
3. If user skips → `cumulativeOvertimeStartDate` remains NULL

### Settings Page

User can view/edit all overtime settings:

```
┌─────────────────────────────────────────────┐
│ Overtime Tracking Settings                  │
├─────────────────────────────────────────────┤
│ Regular hours per week: [25] hours          │
│ Working days per week:  [5] days            │
│   (Expected per day: 5.0 hours)             │
│                                             │
│ Cumulative overtime tracking:               │
│ ○ Disabled                                  │
│ ● Enabled from: [2025-10-01]               │
│                                             │
│ Current cumulative overtime: +12.5 hours    │
│                                             │
│ [ Save Changes ]                            │
└─────────────────────────────────────────────┘
```

### Changing the Start Date

When user changes `cumulativeOvertimeStartDate`:

1. Update value in database
2. Invalidate all `cached_weekly_sums` records
3. Trigger recalculation of cumulative overtime
4. Show notification: "Cumulative overtime recalculated from new start date"

---

## Database Schema Update

### Before

```typescript
// user_clockify_config table
{
  id: string;
  userId: string;
  clockifyApiKey: string;
  clockifyWorkspaceId: string;
  clockifyUserId: string;
  timeZone: string;
  weekStart: string;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

### After

```typescript
// user_clockify_config table
{
  id: string;
  userId: string;
  clockifyApiKey: string;
  clockifyWorkspaceId: string;
  clockifyUserId: string;
  timeZone: string;
  weekStart: string;
  regularHoursPerWeek: number; // NEW: e.g., 25 or 40
  workingDaysPerWeek: number; // NEW: e.g., 5
  cumulativeOvertimeStartDate: date | null; // NEW: e.g., "2025-10-01"
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

### Migration

```sql
-- Add new columns
ALTER TABLE user_clockify_config
ADD COLUMN regularHoursPerWeek REAL NOT NULL DEFAULT 40;

ALTER TABLE user_clockify_config
ADD COLUMN workingDaysPerWeek INTEGER NOT NULL DEFAULT 5;

ALTER TABLE user_clockify_config
ADD COLUMN cumulativeOvertimeStartDate TEXT; -- SQLite stores dates as TEXT

-- Notes:
-- - regularHoursPerWeek: default 40 (standard full-time)
-- - workingDaysPerWeek: default 5 (Mon-Fri)
-- - cumulativeOvertimeStartDate: NULL means "not tracking cumulative"
```

---

## Calculation Examples

### Example 1: Normal Accumulation

**Setup:**

- Start date: 2025-10-01
- Regular hours: 40h/week
- Initial balance: 0h

**Weekly data:**

| Week Start | Actual Hours | Regular | This Week | Cumulative |
| ---------- | ------------ | ------- | --------- | ---------- |
| 2025-09-30 | 42h          | 40h     | N/A       | N/A        |
| 2025-10-07 | 42h          | 40h     | +2h       | +2h        |
| 2025-10-14 | 38h          | 40h     | -2h       | 0h         |
| 2025-10-21 | 45h          | 40h     | +5h       | +5h        |

### Example 2: Weekend Work

**Setup:**

- Regular hours: 25h/week
- Working days: 5 (Mon-Fri)
- Expected per day: 5h

**Week actual hours:**

| Day       | Actual | Expected | Note            |
| --------- | ------ | -------- | --------------- |
| Monday    | 5h     | 5h       | Regular day     |
| Tuesday   | 5h     | 5h       | Regular day     |
| Wednesday | 5h     | 5h       | Regular day     |
| Thursday  | 5h     | 5h       | Regular day     |
| Friday    | 0h     | 5h       | Took day off    |
| Saturday  | 3h     | 0h       | Worked weekend  |
| Sunday    | 0h     | 0h       | Regular weekend |

**Calculation:**

- Total actual: 5+5+5+5+0+3+0 = 23h
- Total expected: 5+5+5+5+5+0+0 = 25h (only working days count)
- Overtime: 23h - 25h = **-2h**

**Key point:** Weekend work simply adds to actual hours, doesn't change expected
hours.

### Example 3: Changing Start Date

**Original:**

- Start date: 2025-10-01
- Current cumulative: +12h (as of 2025-10-31)

**User changes to:**

- New start date: 2025-09-01

**Result:**

- Recalculate all weeks from 2025-09-01
- New cumulative: +18h (includes September)

---

## Alternatives Considered

### Option 1: Calendar Year Reset (Rejected)

- Automatic reset on January 1
- ❌ User doesn't want resets
- ❌ Employment started mid-year (October)
- ❌ Less flexible

### Option 2: First Week with Data (Rejected)

- Auto-detect first Clockify entry
- ❌ User might have old data from previous work
- ❌ Not explicit about intent
- ❌ Could include unwanted historical data

### Option 3: Allow Initial Balance (Rejected for Now)

- Let user set starting overtime (e.g., "+40h")
- ❌ Not needed for current use case
- ❌ Adds complexity to setup
- ✅ Can add later if migrating from another system

### Option 4: Store in `config_chronic` Table (Rejected)

- Use versioned config for start date
- ❌ Overkill - start date rarely changes
- ❌ More complex queries
- ❌ Not a "versioned configuration" like tracked projects

### Option 5: Store in `user` Table (Rejected)

- Add to Better-auth managed user table
- ❌ Better-auth controls this schema
- ❌ Risk of conflicts with Better-auth updates
- ❌ Not auth-related data

---

## Consequences

### Positive

- ✅ User has full control over tracking start point
- ✅ Accurately reflects employment/project start date
- ✅ Simple implementation (single date field)
- ✅ No complex reset logic needed
- ✅ Future-proof (can add features later)

### Negative

- ⚠️ Manual reset requires changing start date (not a "reset" button)
- ⚠️ No initial balance support (must start at 0)
- ⚠️ Need to handle partial weeks if start date mid-week

### Neutral

- 🔵 One additional column in `user_clockify_config`
- 🔵 Nullable field (NULL = not tracking cumulative)
- 🔵 Changing start date triggers full recalculation

---

## Testing Considerations

Test cases needed:

1. ✅ NULL start date → cumulative overtime not calculated
2. ✅ Start date set → cumulative starts at 0
3. ✅ Days before start date → excluded from cumulative
4. ✅ Days after start date → included in cumulative
5. ✅ Partial week (start date mid-week) → only count days from start date
6. ✅ Weekend work → added to actual, doesn't change expected
7. ✅ Working day off → actual 0h, expected still counts
8. ✅ Changing start date → recalculation triggered
9. ✅ Negative cumulative overtime (worked less than regular)
10. ✅ Different regular hours (25h, 30h, 40h)
11. ✅ Different working days (4, 5, 6 days per week)
12. ✅ Edge case: Start date in future → no cumulative yet
13. ✅ Edge case: Non-integer hours per day (e.g., 37.5h / 5 days = 7.5h/day)

---

## Future Enhancements (Out of Scope)

### Potential Future Features

- **Initial balance**: Allow setting starting overtime (+/- hours)
- **Reset button**: "Reset cumulative to 0 from today"
- **Multiple periods**: Track separate periods (e.g., per project)
- **Historical view**: Show cumulative at different points in time
- **Forecast**: Project future cumulative based on trends
- **Alerts**: Notify when cumulative hits thresholds (+40h, -20h, etc.)
- **Export**: Download cumulative overtime history

### If User Needs Reset

Manual workaround:

1. Go to Settings
2. Change `cumulativeOvertimeStartDate` to today
3. Save → cumulative resets to 0 from today forward

Or, add a "Reset" feature:

```typescript
// Backend logic
function resetCumulativeOvertime(userId: string, resetDate: Date) {
  // Update start date to reset date
  await db
    .update(userClockifyConfig)
    .set({ cumulativeOvertimeStartDate: resetDate })
    .where(eq(userClockifyConfig.userId, userId));

  // Invalidate all cached weekly sums
  await invalidateWeeklySumsCache(userId);
}
```

---

## References

- [ARCHITECTURE.md - Database Schema](../ARCHITECTURE.md#database-schema)
- [ARCHITECTURE.md - Cache Invalidation](../ARCHITECTURE.md#cache-invalidation-strategy)
- [Decision: EventSourcingDB vs SQLite](2025_10_31_eventsourcingdb_vs_sqlite.md)
