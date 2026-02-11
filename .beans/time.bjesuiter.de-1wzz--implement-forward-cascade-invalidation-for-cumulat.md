---
# time.bjesuiter.de-1wzz
title: Implement forward cascade invalidation for cumulative overtime
status: completed
type: task
priority: high
created_at: 2026-01-22T12:11:12Z
updated_at: 2026-01-22T12:35:14Z
parent: uvmr
---

When cumulative overtime changes for a week, invalidate (clear) cumulative cache for all following weeks.

## Logic

When user force-refreshes week W and its cumulative overtime changes:

1. Compare new cumulative with old cached cumulative
2. If different: DELETE cumulativeOvertimeSeconds for all weeks AFTER week W
3. Following weeks keep their weeklyOvertime (no Clockify refetch needed)
4. Following weeks will recalculate cumulative on next view (using new base value)

## Important Distinction

- weeklyOvertime: Only changes when Clockify data is refetched
- cumulativeOvertime: Changes when own weekly OR any previous cumulative changes
- Invalidating cumulative does NOT require Clockify refetch

## Implementation

Added `invalidateCumulativeOvertimeAfterWeek()` call after weekly cache insert in:

- `getWeeklyTimeSummary` (clockifyServerFns.ts) - single week force refresh
- `calculateWeeklySumsFromDaily` (cacheServerFns.ts) - bulk refresh operations

The function uses SQL `gt` (greater than) condition to only clear weeks AFTER the given date,
and only clears `cumulativeOvertimeSeconds` field - preserving all weekly overtime data.

## Checklist

- [x] Add cascade invalidation logic after cumulative overtime calculation
- [x] Only invalidate forward in time, never backward
- [x] Only clear cumulativeOvertimeSeconds, not weeklyOvertime data
- [x] Test: refresh week 3 -> weeks 4,5,6 cumulative cleared but weekly data intact
