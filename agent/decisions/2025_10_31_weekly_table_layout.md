# Decision: Weekly Table Layout with Multi-Row Breakdown

**Date**: 2025-10-31\
**Status**: ✅ Decided\
**Context**: Phase 2 - Clockify Integration & Basic Display

---

## Problem

The weekly time tracking table needs to display time data in a way that is:

1. **Transparent** - User can see where time is going
2. **Detailed** - Show tracked projects individually
3. **Complete** - Show all client work, not just tracked projects
4. **Clear** - Make overtime calculation obvious

---

## Decision

**Use a multi-row weekly table with separate rows for tracked projects, extra work,
and totals.**

### Row Structure

For each week, display multiple rows:

1. **One row per tracked project** - Individual tracked projects
2. **One "Extra Work" row** - All other client projects (untracked)
3. **One "Total" row** - Sum of all client work (used for overtime)

---

## Visual Layout

### Example Weekly Table

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Week: Oct 28 - Nov 3, 2025                            Status: 🔓 Pending  │
├──────────────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬──────┬──────┤
│ Project          │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │ Week │ Exp. │
├──────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼──────┼──────┤
│ SMC 1.9          │ 4h  │ 3h  │ 5h  │ 4h  │ 3h  │ -   │ -   │ 19h  │      │
│ Internal Time    │ 1h  │ 2h  │ 0h  │ 1h  │ 2h  │ -   │ -   │  6h  │      │
│ Extra Work       │ 0h  │ 0h  │ 0h  │ 0h  │ 0h  │ 2h  │ 0h  │  2h  │      │
│ ─────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼──────┼──────┤
│ Total (Secunet)  │ 5h  │ 5h  │ 5h  │ 5h  │ 5h  │ 2h  │ 0h  │ 27h  │ 25h  │
├──────────────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴──────┴──────┤
│ Overtime: +2h  │  Cumulative: +12.5h                        [↻] [✓]      │
└───────────────────────────────────────────────────────────────────────────┘

Extra Work details: Administration (1.5h), Recruiting (0.5h)
```

### Key Features

1. **Tracked Projects** (rows 1-2):
   - Individual breakdown of selected projects
   - Daily and weekly totals
   - No expected hours (not used for calculation)

2. **Extra Work** (row 3):
   - Sum of ALL other client projects
   - Tooltip/expandable detail shows which projects
   - Includes weekend work on non-tracked projects

3. **Separator Line**:
   - Visual distinction between breakdown and total

4. **Total Row**:
   - Sum of all rows above
   - Expected hours shown
   - Used for overtime calculation

5. **Footer**:
   - Overtime for this week
   - Cumulative overtime
   - Action buttons (refresh, commit)

---

## Data Model

### Calculation Logic

**For each day:**

```typescript
type DailyBreakdown = {
  date: Date;
  trackedProjects: {
    projectId: string;
    projectName: string;
    seconds: number;
  }[];
  extraWorkSeconds: number; // Sum of untracked client projects
  extraWorkProjects: {
    // For tooltip/details
    projectId: string;
    projectName: string;
    seconds: number;
  }[];
  totalSeconds: number; // Sum of all above
};
```

**Calculation:**

```typescript
async function calculateDailyBreakdown(
  userId: string,
  date: Date
): Promise<DailyBreakdown> {
  // Get user's selected client and tracked projects
  const config = await getUserConfig(userId);
  const trackedProjectsConfig = await getTrackedProjectsForDate(userId, date);

  // Fetch all projects for the client on this date from Clockify
  const allClientProjects = await fetchClockifyDailyData(
    userId,
    date,
    config.selectedClientId
  );

  // Separate tracked vs. untracked
  const trackedProjects = allClientProjects.filter((p) =>
    trackedProjectsConfig.projectIds.includes(p.projectId)
  );

  const extraWorkProjects = allClientProjects.filter(
    (p) => !trackedProjectsConfig.projectIds.includes(p.projectId)
  );

  const extraWorkSeconds = extraWorkProjects.reduce(
    (sum, p) => sum + p.seconds,
    0
  );

  const totalSeconds = allClientProjects.reduce((sum, p) => sum + p.seconds, 0);

  return {
    date,
    trackedProjects,
    extraWorkSeconds,
    extraWorkProjects,
    totalSeconds,
  };
}
```

### Weekly Aggregation

```typescript
type WeeklyBreakdown = {
  weekStart: Date;
  weekEnd: Date;
  dailyBreakdowns: DailyBreakdown[]; // 7 days (Mon-Sun)
  weeklyTrackedProjects: {
    projectId: string;
    projectName: string;
    totalSeconds: number;
  }[];
  weeklyExtraWorkSeconds: number;
  weeklyTotalSeconds: number;
  expectedSeconds: number;
  overtimeSeconds: number;
  cumulativeOvertimeSeconds: number;
  status: "pending" | "committed";
};
```

---

## Transparency Benefits

### What User Sees

**Before (Simple Total):**

```
Week Oct 28 - Nov 3: 27h total, +2h overtime
```

User thinks: "Where did those 27 hours go?"

**After (Multi-Row Breakdown):**

```
SMC 1.9:        19h
Internal Time:   6h
Extra Work:      2h (Administration 1.5h, Recruiting 0.5h)
──────────────
Total:          27h (Expected: 25h)
Overtime:       +2h
```

User sees:

- Most time (19h) on main project (SMC 1.9) ✓
- Some internal time (6h) ✓
- Unexpected work on Saturday (2h extra) ✓
- Clear calculation: 27h actual - 25h expected = +2h overtime ✓

### Overtime Calculation Transparency

The separation makes it obvious how overtime is calculated:

1. **Daily totals** (Mon-Sun) sum to weekly total
2. **Tracked + Extra = Total** (all rows add up correctly)
3. **Total - Expected = Overtime** (clear math)
4. **Working days vs. Weekend** visible in daily columns

---

## Implementation Details

### Database Query

No new tables needed - use existing `cached_daily_project_sums`:

```typescript
async function getWeeklyBreakdown(
  userId: string,
  weekStart: Date
): Promise<WeeklyBreakdown> {
  const weekEnd = addDays(weekStart, 6);
  const config = await getUserConfig(userId);
  const trackedProjectsConfig = await getTrackedProjectsForDate(
    userId,
    weekStart
  );

  // Get all daily project sums for the week
  const dailySums = await db.query.cachedDailyProjectSums.findMany({
    where: and(
      eq(cachedDailyProjectSums.userId, userId),
      gte(cachedDailyProjectSums.date, weekStart),
      lte(cachedDailyProjectSums.date, weekEnd)
    ),
    orderBy: asc(cachedDailyProjectSums.date),
  });

  // Build daily breakdowns
  const dailyBreakdowns = buildDailyBreakdowns(
    dailySums,
    trackedProjectsConfig
  );

  // Aggregate to weekly
  return aggregateToWeekly(dailyBreakdowns, config);
}
```

### Caching Strategy

**Still cache daily project sums:**

```typescript
// cached_daily_project_sums table
{
  id: string;
  userId: string;
  date: date;
  projectId: string;        // Individual project
  projectName: string;
  seconds: number;
  clientId: string;
  calculatedAt: timestamp;
  invalidatedAt: timestamp | null;
}
```

**Build breakdown on-demand:**

- Fetch all cached daily project sums for the week
- Group by tracked/untracked in application logic
- No additional caching needed (fast enough)

---

## User Interface Details

### Tracked Project Rows

- Project name on the left
- 7 daily columns (Mon-Sun)
- Week total column
- Empty "Expected" column (not applicable to individual projects)

### Extra Work Row

- Label: "Extra Work" or "Other Projects"
- 7 daily columns (sum of untracked projects per day)
- Week total column
- Hover tooltip or expandable detail shows project breakdown
- Gray/muted styling to distinguish from tracked projects

### Total Row

- Label: "Total ({ClientName})" e.g., "Total (Secunet)"
- Bold or highlighted styling
- 7 daily columns (sum of all client work per day)
- Week total column
- Expected hours column (e.g., "25h")
- Used for overtime calculation

### Responsive Design

**Desktop (wide screen):**

- All columns visible
- Comfortable spacing

**Tablet:**

- All columns visible
- Tighter spacing
- Scrollable horizontally if needed

**Mobile:**

- Stacked cards per week
- Each day expandable
- Simplified view prioritizing totals

---

## Examples

### Example 1: Normal Work Week

**Setup:**

- Tracked projects: ["SMC 1.9", "Internal Time"]
- Client: Secunet
- Regular hours: 25h/week (5h/day)

**Time logged:**

| Day | SMC 1.9 | Internal | Admin | Total | Expected | Overtime |
| --- | ------- | -------- | ----- | ----- | -------- | -------- |
| Mon | 4h      | 1h       | 0h    | 5h    | 5h       | 0h       |
| Tue | 3h      | 2h       | 0h    | 5h    | 5h       | 0h       |
| Wed | 5h      | 0h       | 0h    | 5h    | 5h       | 0h       |
| Thu | 4h      | 1h       | 0h    | 5h    | 5h       | 0h       |
| Fri | 3h      | 2h       | 0h    | 5h    | 5h       | 0h       |
| Sat | 0h      | 0h       | 0h    | 0h    | 0h       | 0h       |
| Sun | 0h      | 0h       | 0h    | 0h    | 0h       | 0h       |

**Display:**

```
SMC 1.9:       4h │ 3h │ 5h │ 4h │ 3h │ -  │ -  │ 19h
Internal Time: 1h │ 2h │ 0h │ 1h │ 2h │ -  │ -  │  6h
Extra Work:    0h │ 0h │ 0h │ 0h │ 0h │ -  │ -  │  0h
────────────────────────────────────────────────────────
Total:         5h │ 5h │ 5h │ 5h │ 5h │ 0h │ 0h │ 25h │ 25h

Overtime: 0h
```

### Example 2: Weekend Work + Extra Projects

**Setup:**

- Tracked projects: ["SMC 1.9"]
- Client: Secunet
- Regular hours: 25h/week

**Time logged:**

| Day | SMC 1.9 | Admin | Recruiting | Total | Expected | Overtime |
| --- | ------- | ----- | ---------- | ----- | -------- | -------- |
| Mon | 5h      | 0h    | 0h         | 5h    | 5h       | 0h       |
| Tue | 4h      | 0.5h  | 0h         | 4.5h  | 5h       | -0.5h    |
| Wed | 5h      | 0h    | 0h         | 5h    | 5h       | 0h       |
| Thu | 5h      | 1h    | 0h         | 6h    | 5h       | +1h      |
| Fri | 4h      | 0h    | 0.5h       | 4.5h  | 5h       | -0.5h    |
| Sat | 0h      | 2h    | 0h         | 2h    | 0h       | +2h      |
| Sun | 0h      | 0h    | 0h         | 0h    | 0h       | 0h       |

**Display:**

```
SMC 1.9:    5h │ 4h │ 5h │ 5h │ 4h │ -  │ -  │ 23h
Extra Work: 0h │0.5h│ 0h │ 1h │0.5h│ 2h │ -  │  4h ⓘ
────────────────────────────────────────────────────────
Total:      5h │4.5h│ 5h │ 6h │4.5h│ 2h │ 0h │ 27h │ 25h

Extra Work: Administration (3.5h), Recruiting (0.5h)
Overtime: +2h
```

User sees:

- Worked less on SMC 1.9 than expected (23h vs ~25h)
- But did 4h of extra work (Admin + Recruiting)
- Weekend work (Saturday) clearly visible
- Total: 27h, Overtime: +2h

### Example 3: No Extra Work

**All time on tracked projects:**

```
SMC 1.9:       4h │ 5h │ 5h │ 5h │ 4h │ -  │ -  │ 23h
Internal Time: 1h │ 0h │ 0h │ 0h │ 1h │ -  │ -  │  2h
Extra Work:    -  │ -  │ -  │ -  │ -  │ -  │ -  │  0h
────────────────────────────────────────────────────────
Total:         5h │ 5h │ 5h │ 5h │ 5h │ 0h │ 0h │ 25h │ 25h

Overtime: 0h
```

Extra Work row shows zero or could be hidden when empty.

---

## Alternative Layouts Considered

### Option 1: Single Total Row Only (Rejected)

```
Total: 5h │ 5h │ 5h │ 5h │ 5h │ 0h │ 0h │ 25h
```

- ❌ No visibility into project breakdown
- ❌ Can't see where time is spent
- ❌ Not transparent

### Option 2: Tracked Projects Only (Rejected)

```
SMC 1.9:       4h │ 5h │ 5h │ 5h │ 4h │ -  │ -  │ 23h
Internal Time: 1h │ 0h │ 0h │ 0h │ 1h │ -  │ -  │  2h
Total:         5h │ 5h │ 5h │ 5h │ 5h │ 0h │ 0h │ 25h
```

- ❌ Math doesn't add up (23h + 2h = 25h, but what if there's extra work?)
- ❌ Missing extra work visibility
- ❌ Confusing if user works on untracked projects

### Option 3: All Projects Individually (Rejected)

```
SMC 1.9:       ...
Internal Time: ...
Administration:...
Recruiting:    ...
Total:         ...
```

- ❌ Too many rows if user has many projects
- ❌ Cluttered UI
- ❌ User only cares about tracked projects in detail

### Option 4: Separate Tables (Rejected)

One table for tracked projects, another for totals:

- ❌ Harder to see relationship
- ❌ More scrolling
- ❌ Less compact

---

## Consequences

### Positive

- ✅ Full transparency of time allocation
- ✅ Clear overtime calculation
- ✅ Easy to spot unexpected work (Extra Work row)
- ✅ Tracked projects get detailed breakdown
- ✅ All client work accounted for
- ✅ Math is obvious (rows add up to total)
- ✅ Expandable extra work details available

### Negative

- ⚠️ More rows = taller table (more scrolling)
- ⚠️ Extra Work row always present (even if 0h)
- ⚠️ Need to aggregate projects into Extra Work (additional computation)

### Neutral

- 🔵 No additional database tables needed
- 🔵 More complex UI rendering logic
- 🔵 Extra Work tooltip/expandable detail needs implementation

---

## Future Enhancements (Out of Scope)

### Customizable Row Order

- Drag-and-drop to reorder tracked projects
- Pin important projects to top

### Hide Empty Extra Work

- If Extra Work = 0h for entire week, hide the row
- Cleaner view when all work is tracked

### Click to Drill Down

- Click daily cell to see individual time entries
- View entry descriptions, tags, etc.
- Link to Clockify entry for editing

### Color Coding

- Green: On target (≈expected hours)
- Yellow: Under/over by small amount
- Red: Significantly over/under expected

### Charts/Visualizations

- Bar chart showing project breakdown
- Stacked bar for daily time allocation
- Pie chart for weekly distribution

---

## Testing Considerations

Test cases needed:

1. ✅ Week with only tracked projects (no extra work)
2. ✅ Week with tracked + extra work
3. ✅ Week with only extra work (no tracked projects)
4. ✅ Week with 0 hours (empty week)
5. ✅ Tracked project totals add up correctly
6. ✅ Extra work + tracked = total
7. ✅ Weekend work appears in Extra Work row
8. ✅ Extra Work tooltip shows correct project list
9. ✅ Total row matches sum of all rows above
10. ✅ Overtime calculation matches total - expected
11. ✅ Responsive layout on mobile/tablet
12. ✅ Empty Extra Work row handling (show 0h or hide?)

---

## References

- [ARCHITECTURE.md - Weekly Table Component](../ARCHITECTURE.md)
- [Decision: Client Filter and Tracked Projects](2025_10_31_client_filter_and_tracked_projects.md)
- [Decision: Cumulative Overtime Tracking](2025_10_31_cumulative_overtime_tracking.md)

