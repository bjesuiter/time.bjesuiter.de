---
# time.bjesuiter.de-plf5
title: Settings page refresh should also clear cumulative overtime cache
status: completed
type: bug
priority: normal
created_at: 2026-01-22T11:49:30Z
updated_at: 2026-01-22T11:50:28Z
---

When pressing 'refresh' on settings page configuration chronicle, the cumulative overtime calculation should be recalculated for the affected weeks.

## Problem
Currently, refreshConfigTimeRange recalculates daily and weekly sums but doesn't always clear the cumulativeOvertimeSeconds cache in cachedWeeklySums for pending weeks. This means the dashboard may show stale cumulative overtime values after a refresh.

## Solution
After refreshing pending weeks in refreshConfigTimeRange, clear cumulativeOvertimeSeconds for all weeks from the refresh start date onwards to ensure getCumulativeOvertime recalculates them fresh.

## Implementation
Added code in `src/server/cacheServerFns.ts` at the end of `refreshConfigTimeRange` function (after the week processing loop) that:
1. Checks if any weeks were successfully refreshed
2. Clears `cumulativeOvertimeSeconds` for all weeks from the earliest refreshed week onwards
3. This ensures `getCumulativeOvertime` will recalculate fresh values on next query

## Checklist
- [x] Update refreshConfigTimeRange to clear cumulativeOvertimeSeconds for affected weeks
- [x] Build and unit tests pass