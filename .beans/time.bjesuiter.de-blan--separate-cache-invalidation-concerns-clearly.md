---
# time.bjesuiter.de-blan
title: Separate cache invalidation concerns clearly
status: completed
type: task
priority: high
created_at: 2026-01-22T12:11:18Z
updated_at: 2026-01-22T12:27:58Z
parent: uvmr
---

Create clear separation between different types of cache operations.

## Cache Types
1. **Weekly Time Data Cache** (daily project sums, weekly totals)
   - Source: Clockify API
   - Invalidation trigger: User clicks refresh
   - Effect: Refetch from Clockify, recalculate weekly overtime

2. **Cumulative Overtime Cache**
   - Source: Derived from weekly overtime + previous cumulative
   - Invalidation triggers:
     a) Weekly overtime of this week changed
     b) Cumulative overtime of previous week changed
   - Effect: Recalculate from cached weekly data (NO Clockify call)

## Operations
- `refreshWeekFromClockify(week)`: Fetches fresh data, recalculates weekly, then cumulative
- `recalculateCumulative(week)`: Uses cached weekly data, only recalculates cumulative

## Checklist
- [x] Create clear function separation for these operations
  - Added `recalculateCumulativeOvertimeFromCache` in cacheHelpers.ts
  - Added `invalidateCumulativeOvertimeAfterWeek` in cacheHelpers.ts
- [x] Document when each type of invalidation occurs
  - Added Cache Operations Guide docstring in cacheHelpers.ts
- [x] Ensure Clockify is NEVER called for cumulative-only recalculation
  - Removed Clockify API call from getCumulativeOvertime - now only uses cached weekly data
- [x] Add logging to make cache operations traceable
  - Added logger.info/debug calls to all cache operations