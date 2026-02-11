---
# time.bjesuiter.de-gnna
title: Remove locked/committed weeks concept
status: completed
type: task
priority: high
created_at: 2026-01-22T12:11:06Z
updated_at: 2026-01-22T12:24:42Z
parent: uvmr
---

Remove the locked/committed weeks feature as it adds complexity without clear benefit.

## What to Remove

- `status` field usage ('committed' vs 'pending') in cachedWeeklySums
- `committedAt` field usage
- commitWeek / uncommitWeek server functions
- refreshCommittedWeek server function (merge into regular refresh)
- weeklyDiscrepancies table/logic
- Lock/Unlock UI buttons on week view
- Special handling for committed weeks in refresh logic

## What to Keep

- Basic cache validity (invalidatedAt for actual cache invalidation)
- Refresh functionality (but simplified - same for all weeks)

## Checklist

- [x] Remove status/committedAt logic from cacheServerFns.ts
- [x] Remove commitWeek, uncommitWeek, refreshCommittedWeek functions
- [x] Remove weeklyDiscrepancies related code
- [x] Update refreshConfigTimeRange to not differentiate committed/pending
- [x] Remove Lock/Unlock UI from WeeklyTimeTable component (actually from index.tsx)
- [x] Update any queries that check for committed status (clockifyServerFns.ts)
- [ ] Clean up database schema (optional - left fields unused for now)
