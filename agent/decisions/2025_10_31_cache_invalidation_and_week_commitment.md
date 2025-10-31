# Decision: Cache Invalidation and Week Commitment

**Date**: 2025-10-31\
**Status**: ✅ Decided\
**Context**: Phase 4 - Caching Layer & Optimization

---

## Problem

The application caches weekly time summaries and overtime calculations to avoid
excessive Clockify API calls. However, we need a strategy for:

1. **When to refresh data** - Fresh data for current work vs. stable historical
   data
2. **Data stability** - Once a week is reported to work systems, changes are
   problematic
3. **Manual overrides** - User needs control over when data updates
4. **Discrepancy tracking** - If Clockify data changes after commitment, user
   must know

---

## Decision

**Implement a week commitment system with status-based refresh logic and
discrepancy tracking.**

### Core Concept: Week Status

Each week has a status:

- **Pending**: Active, auto-refreshes on page load
- **Committed**: Frozen, never auto-refreshes (manual only)

Once a user commits a week (reports it to work systems), it should never change
unexpectedly.

---

## Implementation Details

### 1. Database Schema Updates

**Add to `cached_weekly_sums` table:**

```typescript
{
  id: string
  userId: string
  weekStart: date
  weekEnd: date
  clientId: string
  totalSeconds: number
  regularHoursBaseline: number
  overtimeSeconds: number
  cumulativeOvertimeSeconds: number
  configSnapshotId: string
  calculatedAt: timestamp
  invalidatedAt: timestamp | null
  status: enum('pending', 'committed')      // NEW
  committedAt: timestamp | null             // NEW
}
```

**Create new `weekly_discrepancies` table:**

```typescript
{
  id: string (primary key)
  userId: string (foreign key -> user.id)
  weekStart: date
  weekEnd: date
  detectedAt: timestamp                     // When discrepancy was found
  oldTotalSeconds: number                   // Original committed value
  newTotalSeconds: number                   // New value from Clockify
  oldOvertimeSeconds: number
  newOvertimeSeconds: number
  differenceTotalSeconds: number            // newTotal - oldTotal
  differenceOvertimeSeconds: number         // newOvertime - oldOvertime
  acknowledged: boolean                     // User has seen the warning
  acknowledgedAt: timestamp | null
}
```

### 2. Refresh Logic

**On Page Load:**

```typescript
async function refreshWeeklySumsOnPageLoad(userId: string) {
    // Get all pending (uncommitted) weeks visible on current page
    const pendingWeeks = await db.query.cachedWeeklySums.findMany({
        where: and(
            eq(cachedWeeklySums.userId, userId),
            eq(cachedWeeklySums.status, "pending"),
        ),
    });

    // Refresh each pending week from Clockify
    for (const week of pendingWeeks) {
        await refetchAndRecalculateWeek(userId, week.weekStart);
    }

    // Committed weeks: DO NOT REFRESH
}
```

**Committed weeks never auto-refresh:**

- Skipped during page load refresh
- Skipped during periodic background jobs
- Only refreshed via explicit manual trigger

### 3. Manual Refresh Actions

**A) Per-Week Refresh Button**

Each week in the table has a "Refetch & Recalculate" button:

```typescript
async function refetchAndRecalculateWeek(
  userId: string,
  weekStart: Date
): Promise<{ hasDiscrepancy: boolean; discrepancy?: Discrepancy }> {
  // Fetch fresh data from Clockify for this week
  const freshData = await fetchClockifyDataForWeek(userId, weekStart);

  // Get existing cached data
  const cached = await db.query.cachedWeeklySums.findFirst({
    where: and(
      eq(cachedWeeklySums.userId, userId),
      eq(cachedWeeklySums.weekStart, weekStart)
    )
  });

  // If week was committed, check for discrepancies
  if (cached?.status === 'committed') {
    const hasChanged =
      cached.totalSeconds !== freshData.totalSeconds ||
      cached.overtimeSeconds !== freshData.overtimeSeconds;

    if (hasChanged) {
      // Log discrepancy
      await db.insert(weeklyDiscrepancies).values({
        id: generateId(),
        userId,
        weekStart: cached.weekStart,
        weekEnd: cached.weekEnd,
        detectedAt: new Date(),
        oldTotalSeconds: cached.totalSeconds,
        newTotalSeconds: freshData.totalSeconds,
        oldOvertimeSeconds: cached.overtimeSeconds,
        newOvertimeSeconds: freshData.overtimeSeconds,
        differenceTotalSeconds: freshData.totalSeconds - cached.totalSeconds,
        differenceOvertimeSeconds:
          freshData.overtimeSeconds - cached.overtimeSeconds,
        acknowledged: false,
        acknowledgedAt: null,
      });

      return { hasDiscrepancy: true, discrepancy: /* ... */ };
    }
  }

  // Update cached data
  await db
    .update(cachedWeeklySums)
    .set({
      totalSeconds: freshData.totalSeconds,
      overtimeSeconds: freshData.overtimeSeconds,
      calculatedAt: new Date(),
      invalidatedAt: null,
    })
    .where(eq(cachedWeeklySums.id, cached.id));

  return { hasDiscrepancy: false };
}
```

**B) Settings Page: Annual Refresh**

"Refresh & Recalculate from January 1st" button:

```typescript
async function refreshFromJanuaryFirst(userId: string, year: number) {
    const startDate = new Date(year, 0, 1); // Jan 1

    // Get all weeks from Jan 1 onwards
    const weeks = await db.query.cachedWeeklySums.findMany({
        where: and(
            eq(cachedWeeklySums.userId, userId),
            gte(cachedWeeklySums.weekStart, startDate),
        ),
        orderBy: asc(cachedWeeklySums.weekStart),
    });

    const discrepancies: Discrepancy[] = [];

    // Refresh each week
    for (const week of weeks) {
        const result = await refetchAndRecalculateWeek(userId, week.weekStart);
        if (result.hasDiscrepancy) {
            discrepancies.push(result.discrepancy);
        }
    }

    // If any committed weeks changed, show warning
    if (discrepancies.length > 0) {
        return {
            success: true,
            warning: `${discrepancies.length} committed weeks have changed!`,
            discrepancies,
        };
    }

    return { success: true };
}
```

### 4. Week Commitment

**Commit a week:**

```typescript
async function commitWeek(userId: string, weekStart: Date) {
    await db
        .update(cachedWeeklySums)
        .set({
            status: "committed",
            committedAt: new Date(),
        })
        .where(
            and(
                eq(cachedWeeklySums.userId, userId),
                eq(cachedWeeklySums.weekStart, weekStart),
            ),
        );
}
```

**Uncommit a week (if needed):**

```typescript
async function uncommitWeek(userId: string, weekStart: Date) {
    await db
        .update(cachedWeeklySums)
        .set({
            status: "pending",
            committedAt: null,
        })
        .where(
            and(
                eq(cachedWeeklySums.userId, userId),
                eq(cachedWeeklySums.weekStart, weekStart),
            ),
        );
}
```

---

## User Interface

### Weekly Table View

```
┌─────────────────────────────────────────────────────────────────────┐
│ Week          │ Total  │ Overtime │ Cumulative │ Status    │ Actions│
├─────────────────────────────────────────────────────────────────────┤
│ Oct 28 - Nov 3│ 25h    │ +0h      │ +12.5h     │ 🔓 Pending│ [↻][✓]│
│ Oct 21 - 27   │ 28h    │ +3h      │ +12.5h     │ 🔒 Commit │ [↻]   │
│ Oct 14 - 20   │ 23h    │ -2h      │ +9.5h      │ 🔒 Commit │ [↻]   │
└─────────────────────────────────────────────────────────────────────┘

Legend:
- [↻] Refetch & Recalculate (always available)
- [✓] Commit Week (only for pending weeks)
- 🔓 Pending = Auto-refreshes on page load
- 🔒 Committed = Frozen, manual refresh only
```

### Settings Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ Data Refresh Settings                                               │
├─────────────────────────────────────────────────────────────────────┤
│ Annual Refresh:                                                     │
│                                                                     │
│ Refresh & recalculate all weeks from:                              │
│ [📅 January 1, 2025]  [ Refresh All Data ]                        │
│                                                                     │
│ ⚠️ Warning: This will refresh ALL weeks (including committed).    │
│    Discrepancies will be logged and highlighted.                   │
│                                                                     │
│ Last full refresh: 2025-10-31 14:32                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Discrepancy Warning (Future UI)

When committed weeks change during refresh:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ DISCREPANCIES DETECTED                                          │
├─────────────────────────────────────────────────────────────────────┤
│ 2 committed weeks have changed in Clockify:                        │
│                                                                     │
│ Week Oct 14-20:                                                    │
│   Old: 25h (0h overtime)  →  New: 23h (-2h overtime)              │
│   Difference: -2h total, -2h overtime                              │
│   ⚠️ Already reported to work systems!                            │
│                                                                     │
│ Week Oct 7-13:                                                     │
│   Old: 40h (0h overtime)  →  New: 42h (+2h overtime)              │
│   Difference: +2h total, +2h overtime                              │
│   ⚠️ Already reported to work systems!                            │
│                                                                     │
│ [ View Details ]  [ Acknowledge ]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Rationale

### Why Week Commitment?

1. **Data Stability**: Once reported to work systems, changes are problematic
2. **User Control**: Explicit action to "lock in" a week
3. **Problem Prevention**: Avoids surprise changes to historical data
4. **Audit Trail**: Clear record of when data was committed

### Why Discrepancy Tracking?

1. **Visibility**: User must know if Clockify data changed post-commitment
2. **Problem Detection**: Catches cases where time entries were edited/deleted
3. **Reconciliation**: User can investigate and fix in Clockify or work systems
4. **Critical Alert**: This is a serious problem requiring immediate attention

### Why Pending Auto-Refresh?

1. **Fresh Data**: Current work always up-to-date
2. **Convenience**: No manual refresh needed for ongoing work
3. **User Experience**: See latest time entries immediately

### Why Manual-Only for Committed?

1. **Stability**: Committed weeks should never change unexpectedly
2. **Performance**: Fewer API calls (most weeks are historical)
3. **Explicit Control**: User decides when to update historical data

---

## Refresh Strategy Summary

| Week Status | Page Load | Periodic Job | Manual Refresh | Discrepancy Tracking |
| ----------- | --------- | ------------ | -------------- | -------------------- |
| Pending     | ✅ Yes    | ❌ No        | ✅ Yes         | ❌ No                |
| Committed   | ❌ No     | ❌ No        | ✅ Yes         | ✅ Yes               |

**Key Rules:**

1. Pending weeks refresh automatically on page load
2. Committed weeks NEVER auto-refresh
3. Manual refresh always available for any week
4. Discrepancies logged ONLY for committed weeks
5. Annual refresh (Jan 1) refreshes everything, logs discrepancies

---

## Database Migration

```sql
-- Add status columns to cached_weekly_sums
ALTER TABLE cached_weekly_sums
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
  CHECK(status IN ('pending', 'committed'));

ALTER TABLE cached_weekly_sums
ADD COLUMN committedAt TEXT; -- ISO timestamp

-- Create discrepancies table
CREATE TABLE weekly_discrepancies (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES user(id),
  weekStart TEXT NOT NULL,
  weekEnd TEXT NOT NULL,
  detectedAt TEXT NOT NULL,
  oldTotalSeconds INTEGER NOT NULL,
  newTotalSeconds INTEGER NOT NULL,
  oldOvertimeSeconds INTEGER NOT NULL,
  newOvertimeSeconds INTEGER NOT NULL,
  differenceTotalSeconds INTEGER NOT NULL,
  differenceOvertimeSeconds INTEGER NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0, -- SQLite boolean
  acknowledgedAt TEXT
);

-- Index for querying user's discrepancies
CREATE INDEX idx_weekly_discrepancies_user
  ON weekly_discrepancies(userId, acknowledged);

-- Index for weekly_sums status queries
CREATE INDEX idx_cached_weekly_sums_status
  ON cached_weekly_sums(userId, status);
```

---

## Examples

### Example 1: Normal Weekly Workflow

**Week 1 (Current week):**

- Status: Pending
- Auto-refreshes on page load
- User works Mon-Thu: data updates each day
- Friday: User commits the week
- Status: Committed
- No longer auto-refreshes

**Week 2 (Next week):**

- Status: Pending (new week)
- Auto-refreshes as user logs time

### Example 2: Discrepancy Detection

**Timeline:**

1. **Oct 14-20**: User logs 25h total
2. **Oct 21**: User commits week Oct 14-20
3. **Oct 31**: User clicks "Refresh from Jan 1"
4. **Surprise**: Clockify now shows 23h for Oct 14-20
   - Someone deleted 2h of time entries?
   - User forgot to log something and just added it?

**Result:**

```
Discrepancy logged:
- Week: Oct 14-20
- Old: 25h
- New: 23h
- Difference: -2h
- Status: Unacknowledged
```

UI shows warning banner, highlights week in red.

### Example 3: Manual Refresh for Committed Week

User notices a mistake in a committed week:

1. Week Oct 7-13 is committed
2. User realizes they forgot to log 3h on Oct 10
3. User adds entry in Clockify
4. User clicks [↻] button for Oct 7-13
5. No discrepancy logged (user explicitly triggered refresh)
6. Data updates: 25h → 28h

Alternative: If user accidentally triggers refresh and sees discrepancy, they
can investigate why Clockify changed.

---

## Edge Cases & Considerations

### What if user forgets to commit?

- No problem - pending weeks keep refreshing
- User can commit retroactively
- UI could remind: "Week is 2+ weeks old, consider committing"

### Can committed weeks be uncommitted?

- Yes, via uncommit function
- Useful if user needs to make changes
- Once uncommitted, auto-refresh resumes
- Could add confirmation: "Uncommit will allow auto-refresh again"

### What about configuration changes?

From
[Cumulative Overtime Tracking Decision](2025_10_31_cumulative_overtime_tracking.md):

- Changing `regularHoursPerWeek` or `cumulativeOvertimeStartDate` invalidates
  all weeks
- This overrides commitment status (recalculation forced)
- Discrepancies NOT logged (user triggered via config change)
- After recalculation, weeks return to their previous status

### Multiple discrepancies for same week?

- Each refresh creates new discrepancy record
- Table shows history of all detected changes
- UI shows most recent unacknowledged discrepancy

### Performance with many pending weeks?

- Limit page load refresh to visible weeks (current + next/prev few)
- Background job can refresh earlier pending weeks periodically (optional)
- Committed weeks never refreshed → reduces load significantly

---

## Alternatives Considered

### Option 1: Time-Based Invalidation (Rejected)

- Invalidate cache after N hours/days
- ❌ No user control
- ❌ Can change committed data unexpectedly
- ❌ No distinction between current and historical work

### Option 2: Manual Refresh Only (Rejected)

- No auto-refresh at all
- ❌ Poor UX for current work
- ❌ User must remember to refresh
- ❌ Stale data by default

### Option 3: Full Refresh on Page Load (Rejected)

- Refresh all weeks every time
- ❌ Excessive Clockify API calls
- ❌ Slow page loads
- ❌ Committed data still changes

### Option 4: No Discrepancy Tracking (Rejected)

- Just update committed weeks silently
- ❌ User doesn't know data changed
- ❌ Work system reports become wrong
- ❌ No audit trail

---

## Consequences

### Positive

- ✅ User has full control over data stability
- ✅ Current work always fresh
- ✅ Historical data protected from changes
- ✅ Discrepancies visible and tracked
- ✅ Explicit user action for commitment
- ✅ Reduces Clockify API calls significantly
- ✅ Prevents nasty surprises with work system reports

### Negative

- ⚠️ User must remember to commit weeks
- ⚠️ More complex caching logic
- ⚠️ Additional database table and columns
- ⚠️ Need UI for commitment actions and discrepancy warnings

### Neutral

- 🔵 New table: `weekly_discrepancies`
- 🔵 Two new columns in `cached_weekly_sums`
- 🔵 More buttons in UI (commit, uncommit, refresh)
- 🔵 Need to handle configuration change edge cases

---

## Future Enhancements (Out of Scope)

### Auto-Commit Suggestions

- Detect weeks that are >7 days old and pending
- Show notification: "Week Oct 14-20 is ready to commit"
- One-click commit from notification

### Bulk Commit

- Select multiple weeks
- "Commit Selected" button
- Useful for committing several weeks at once

### Discrepancy Resolution Workflow

- UI to compare old vs. new values side-by-side
- Option to "Accept changes" or "Revert"
- Link to Clockify to view/edit time entries
- Mark as resolved vs. acknowledged

### Export Discrepancies

- Download CSV of all discrepancies
- For recordkeeping or auditing
- Include old/new values, differences, dates

### Configurable Auto-Commit

- Setting: "Auto-commit weeks older than N days"
- Automated but user-controlled
- Could reduce manual work for users who don't need fine control

---

## Testing Considerations

Test cases needed:

1. ✅ Pending week refreshes on page load
2. ✅ Committed week does NOT refresh on page load
3. ✅ Manual refresh works for both pending and committed
4. ✅ Committing a week updates status and timestamp
5. ✅ Uncommitting a week reverts status
6. ✅ Discrepancy detected when committed week changes
7. ✅ Discrepancy NOT detected when pending week changes
8. ✅ Multiple discrepancies for same week tracked separately
9. ✅ Annual refresh from Jan 1 includes all weeks
10. ✅ Annual refresh logs discrepancies for committed weeks
11. ✅ Configuration change recalculates all weeks (committed or not)
12. ✅ UI shows correct status icons and available actions
13. ✅ Discrepancy warning displays correctly
14. ✅ Performance: Only visible pending weeks refresh on page load

---

## References

- [ARCHITECTURE.md - Cache Invalidation
  Strategy](../ARCHITECTURE.md#cache-invalidation-strategy)
- [Decision: Cumulative Overtime Tracking](2025_10_31_cumulative_overtime_tracking.md)
- [ARCHITECTURE.md - Database Schema](../ARCHITECTURE.md#database-schema)
