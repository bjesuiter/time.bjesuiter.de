# Decision: Initial Data Fetch Scope and Navigation

**Date**: 2025-10-31\
**Status**: ✅ Decided\
**Context**: Phase 2 - Clockify Integration & Basic Display

---

## Problem

When a user opens the time tracking dashboard, we need to determine:

1. **Initial view** - Which weeks to display by default
2. **Historical access** - How far back user can view
3. **Navigation** - How user browses different time periods

---

## Decision

**Display current month plus the week before the month starts, with pagination for
historical access.**

### Default View

**Show: Current calendar month + previous week**

Example for October 31, 2025:

- Current month: October 2025 (Oct 1 - Oct 31)
- October starts on Wednesday, Oct 1
- Week containing Oct 1: Mon Sep 29 - Sun Oct 5
- Week before that: Mon Sep 22 - Sun Sep 28

**Displayed weeks:**

```
Week Sep 22-28   (week before month start)
Week Sep 29-Oct 5 (contains month start)
Week Oct 6-12
Week Oct 13-19
Week Oct 20-26
Week Oct 27-Nov 2 (current week, may extend into next month)
```

Total: Approximately 5-6 weeks displayed

---

## Implementation Details

### 1. Calculate Default Date Range

```typescript
function getDefaultDateRange(
  currentDate: Date,
  weekStart: "MONDAY" | "SUNDAY"
): { startDate: Date; endDate: Date; weeks: Date[] } {
  // Get first day of current month
  const monthStart = startOfMonth(currentDate);

  // Get the week containing the first day of the month
  const weekContainingMonthStart = getWeekStart(monthStart, weekStart);

  // Get the week before that
  const startDate = subDays(weekContainingMonthStart, 7);

  // Get the week containing current date (end of view)
  const endDate = getWeekEnd(currentDate, weekStart);

  // Generate list of week start dates
  const weeks = generateWeekStarts(startDate, endDate);

  return { startDate, endDate, weeks };
}
```

**Example calculation for Oct 31, 2025 (weekStart = MONDAY):**

```typescript
currentDate = 2025-10-31
monthStart = 2025-10-01 (Wednesday)
weekContainingMonthStart = 2025-09-29 (Monday)
startDate = 2025-09-22 (Monday, one week before)
endDate = 2025-11-02 (Sunday, end of current week)

weeks = [
  2025-09-22,  // Week 1
  2025-09-29,  // Week 2 (contains month start)
  2025-10-06,  // Week 3
  2025-10-13,  // Week 4
  2025-10-20,  // Week 5
  2025-10-27   // Week 6 (current week)
]
```

### 2. Fetching Data

**On page load:**

```typescript
async function loadDefaultView(userId: string) {
  const config = await getUserConfig(userId);
  const currentDate = new Date();

  // Calculate default date range
  const { weeks } = getDefaultDateRange(currentDate, config.weekStart);

  // Fetch weekly data for each week
  const weeklyData = await Promise.all(
    weeks.map((weekStart) => getWeeklyBreakdown(userId, weekStart))
  );

  return weeklyData;
}
```

**With caching:**

- Pending weeks: Auto-refresh from Clockify
- Committed weeks: Use cached data

### 3. Navigation

**Pagination controls:**

```
[← Previous Month] [Current Month] [Next Month →]

Or:

[← Oct 2025] [Nov 2025 →]
```

**Navigation logic:**

```typescript
async function navigateToMonth(userId: string, year: number, month: number) {
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const config = await getUserConfig(userId);

  // Calculate date range for this month
  const { weeks } = getDefaultDateRange(firstDayOfMonth, config.weekStart);

  // Fetch and display
  const weeklyData = await Promise.all(
    weeks.map((weekStart) => getWeeklyBreakdown(userId, weekStart))
  );

  return weeklyData;
}
```

**Quick navigation options:**

- "Today" button - Jump to current month
- Month picker - Select specific month/year
- Arrow buttons - Previous/next month

---

## Rationale

### Why Current Month + Previous Week?

1. **Context**: User sees the full current month in context
2. **Month transitions**: Previous week provides context when month just started
3. **Practical**: Most users care about current and recent work
4. **Performance**: Limited data fetch (5-6 weeks) loads quickly

### Why Not Just Current Month?

**Problem**: If today is October 1st:

- Current month = just 1 day (Oct 1)
- Only shows 1 week (Sep 29 - Oct 5)
- Very limited view
- Missing recent context

**Solution**: Adding previous week ensures meaningful data even on month start.

### Why Not Always Show Fixed N Weeks?

**Problem with fixed 4-week view:**

- Mid-month: Misses start of month
- Month-end: Spans two months awkwardly
- No alignment with calendar month

**Solution**: Month-based view aligns with how users think about time.

### Why Month-Based Navigation?

1. **Mental Model**: Users think in months ("What did I do in October?")
2. **Work Reports**: Often submitted monthly
3. **Clear Boundaries**: Month = natural grouping
4. **Cumulative Overtime**: Easy to see progression through the month

---

## User Interface

### Default View (Oct 31, 2025)

```
┌───────────────────────────────────────────────────────────────┐
│  [← Sep 2025]          October 2025          [Nov 2025 →]     │
│                                                    [Today]     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ Week: Sep 22 - 28, 2025                    Status: 🔒 Commit │
│ [Weekly breakdown table]                                      │
│                                                               │
│ Week: Sep 29 - Oct 5, 2025                 Status: 🔒 Commit │
│ [Weekly breakdown table]                                      │
│                                                               │
│ Week: Oct 6 - 12, 2025                     Status: 🔒 Commit │
│ [Weekly breakdown table]                                      │
│                                                               │
│ Week: Oct 13 - 19, 2025                    Status: 🔒 Commit │
│ [Weekly breakdown table]                                      │
│                                                               │
│ Week: Oct 20 - 26, 2025                    Status: 🔒 Commit │
│ [Weekly breakdown table]                                      │
│                                                               │
│ Week: Oct 27 - Nov 2, 2025                 Status: 🔓 Pending│
│ [Weekly breakdown table]                   ← Current week     │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Navigation Actions

**Previous Month:**

- User clicks "← Sep 2025"
- Loads: August 29 - October 5
  - Week before September 1
  - All of September
  - Current week at page load time (if applicable)

**Next Month:**

- User clicks "Nov 2025 →"
- Loads: October 27 - November 30
  - Week before November 1
  - All of November

**Today Button:**

- Jumps back to current month view
- Scrolls to current week

**Month/Year Picker:**

```
┌─────────────────────┐
│ Select Month & Year │
├─────────────────────┤
│ Month: [October ▼]  │
│ Year:  [2025 ▼]     │
│                     │
│ [ Go ]  [ Cancel ]  │
└─────────────────────┘
```

---

## Examples

### Example 1: Mid-Month (Oct 15, 2025)

**Current date**: October 15, 2025 (Wednesday)

**Displayed weeks:**

```
Sep 22-28   (week before Oct 1)
Sep 29-Oct 5
Oct 6-12
Oct 13-19   ← Current week
```

User sees:

- Full context of October so far
- Previous week for comparison
- Current week (pending)

### Example 2: Month Start (Nov 1, 2025)

**Current date**: November 1, 2025 (Saturday)

**Displayed weeks:**

```
Oct 20-26   (week before Nov 1)
Oct 27-Nov 2 ← Current week (contains Nov 1)
```

User sees:

- Previous week from October
- Current week spanning October-November
- Not a lot of data, but that's expected at month start

### Example 3: Month End (Oct 31, 2025)

**Current date**: October 31, 2025 (Friday)

**Displayed weeks:**

```
Sep 22-28   (week before Oct 1)
Sep 29-Oct 5
Oct 6-12
Oct 13-19
Oct 20-26
Oct 27-Nov 2 ← Current week
```

User sees:

- Entire October
- Previous week for context
- Current week spanning into November

### Example 4: Week Start = Sunday

**Current date**: October 31, 2025 (Friday)\
**Week start**: SUNDAY

**Displayed weeks:**

```
Sep 21-27   (week before Oct 1)
Sep 28-Oct 4 (contains Oct 1)
Oct 5-11
Oct 12-18
Oct 19-25
Oct 26-Nov 1 ← Current week
```

Same logic, different week boundaries.

---

## Edge Cases

### Current Week Spans Two Months

**Scenario**: Current week is Oct 27 - Nov 2

**Behavior**:

- If viewing October: Include this week (it started in October)
- If viewing November: Include this week (it contains November days)

**Implementation**: Week is included in a month if it intersects with that month.

### First Day of Month is First Day of Week

**Scenario**: October 1, 2025 is a Monday (weekStart = MONDAY)

**Displayed weeks:**

```
Sep 22-28   (week before Oct 1)
Sep 29-Oct 5 ❌ WRONG - this week starts Sep 29
```

**Correction:**

```
Sep 22-28   (week before Oct 1)
Oct 1-7     (first week of October) ✓
Oct 8-14
...
```

**Implementation**: `weekContainingMonthStart` should be the week that starts on or
before the first day of the month.

### Historical Months (No Current Week)

**Scenario**: User navigates to August 2025 (in the past)

**Displayed weeks:**

```
Jul 28-Aug 3  (week before Aug 1)
Aug 4-10
Aug 11-17
Aug 18-24
Aug 25-31
```

No "current week" indicator, all weeks are historical.

### Future Months

**Scenario**: User navigates to December 2025 (in the future)

**Behavior**:

- Calculate date range as normal
- Weeks in the future show no data (or show as "Not yet available")
- Or disable navigation to future months

**Decision**: Allow viewing future months (for planning), but show empty data.

---

## Historical Access

### No Limit on Historical Data

User can navigate back to any month since `cumulativeOvertimeStartDate`.

**Example**:

- User started October 1, 2025
- Now it's March 2026
- User can navigate back to October 2025

### Navigation Constraints

**Earliest month**: Month containing `cumulativeOvertimeStartDate`

```typescript
function canNavigateToMonth(
  userId: string,
  year: number,
  month: number
): boolean {
  const config = await getUserConfig(userId);

  if (!config.cumulativeOvertimeStartDate) {
    // No start date set, allow any month
    return true;
  }

  const targetDate = new Date(year, month - 1, 1);
  const startDate = new Date(config.cumulativeOvertimeStartDate);

  // Can navigate if target month is on or after start month
  return targetDate >= startOfMonth(startDate);
}
```

**Latest month**: Current month (or allow future months for planning)

---

## Performance Considerations

### Typical Load

**5-6 weeks × 7 days = ~35-42 daily breakdowns**

Each daily breakdown:

- Fetch from `cached_daily_project_sums`
- Group by tracked/untracked
- Calculate extra work

**Performance**: Should be fast (<200ms) with proper indexing.

### Optimization: Pre-aggregate to Weekly

Store weekly summaries in `cached_weekly_sums` (already planned):

```typescript
// Fast path: Load weekly summaries
const weeklySums = await db.query.cachedWeeklySums.findMany({
  where: and(
    eq(cachedWeeklySums.userId, userId),
    gte(cachedWeeklySums.weekStart, startDate),
    lte(cachedWeeklySums.weekStart, endDate)
  ),
});

// For pending weeks, refresh as needed
// For committed weeks, use cached values
```

### Pagination Benefits

**Month-based pagination**:

- Only load ~5-6 weeks at a time
- Not loading entire year upfront
- Fast page loads
- Infinite scroll not needed

---

## Alternatives Considered

### Option 1: Fixed 4-Week Rolling Window (Rejected)

Show current week + 3 previous weeks

- ❌ Doesn't align with month boundaries
- ❌ Less intuitive for users
- ❌ Misses monthly context

### Option 2: Entire Current Year (Rejected)

Load Jan 1 - present on every page load

- ❌ Slow load times (could be 40+ weeks)
- ❌ Too much data at once
- ❌ Most data not immediately relevant

### Option 3: Current Week Only (Rejected)

Show only the current week

- ❌ No context
- ❌ Can't see monthly progression
- ❌ Need to navigate constantly

### Option 4: Infinite Scroll (Rejected)

Load more weeks as user scrolls

- ❌ More complex implementation
- ❌ Month boundaries unclear
- ❌ Harder to jump to specific dates

### Option 5: Current Month Only (No Previous Week) (Rejected)

Show just the calendar month

- ❌ At month start, very limited data
- ❌ Missing recent context
- ❌ Feels incomplete early in month

---

## Consequences

### Positive

- ✅ Clear, intuitive default view
- ✅ Month-aligned navigation
- ✅ Fast page loads (limited data)
- ✅ Context at month start (previous week)
- ✅ Aligns with mental model (monthly thinking)
- ✅ Simple pagination (previous/next month)

### Negative

- ⚠️ Variable number of weeks displayed (5-6)
- ⚠️ Can't see multiple months at once (need navigation)
- ⚠️ Month transitions span two pagination views

### Neutral

- 🔵 Need date calculation logic for month + previous week
- 🔵 Navigation requires month picker or arrows
- 🔵 Some weeks appear in two month views (transition weeks)

---

## Future Enhancements (Out of Scope)

### Custom Date Range

User selects arbitrary start/end dates:

```
From: [2025-10-01] To: [2025-12-31]
```

- View specific time periods
- For analysis or reporting

### View Modes

Toggle between:

- **Month view** (current implementation)
- **Quarter view** (3 months at once)
- **Year view** (all 12 months, collapsed)

### Keyboard Navigation

- Arrow keys to navigate weeks
- Page up/down for months
- Home/end for first/last week

### Bookmarks

- Save favorite date ranges
- Quick access to important months
- "End of Q3 2025", "Project SMC 1.9 start", etc.

### Print View

- Optimized layout for printing monthly reports
- Hide interactive elements
- Show all weeks on one page

---

## Testing Considerations

Test cases needed:

1. ✅ Default view calculates correct date range
2. ✅ Month start = week start (Oct 1 = Monday)
3. ✅ Month start mid-week (Oct 1 = Wednesday)
4. ✅ Different weekStart settings (MONDAY vs SUNDAY)
5. ✅ Navigation to previous month
6. ✅ Navigation to next month
7. ✅ "Today" button returns to current month
8. ✅ Current week highlighted correctly
9. ✅ Historical months (no current week)
10. ✅ Future months (empty data)
11. ✅ Can't navigate before `cumulativeOvertimeStartDate`
12. ✅ Edge case: Month with 4 weeks vs 5 weeks
13. ✅ Edge case: Leap year (February)

---

## References

- [ARCHITECTURE.md - Weekly Table Component](../ARCHITECTURE.md)
- [Decision: Timezone and Week Boundaries](2025_10_31_timezone_and_week_boundaries.md)
- [Decision: Cumulative Overtime Tracking](2025_10_31_cumulative_overtime_tracking.md)
- [Decision: Weekly Table Layout](2025_10_31_weekly_table_layout.md)

