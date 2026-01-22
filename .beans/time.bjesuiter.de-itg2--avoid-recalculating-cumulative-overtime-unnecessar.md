---
# time.bjesuiter.de-itg2
title: Avoid recalculating cumulative overtime unnecessarily
status: completed
type: bug
created_at: 2026-01-22T10:50:58Z
updated_at: 2026-01-22T11:15:00Z
---

Investigate why cumulative overtime always recalculates on week load. Only calculate when no cached value, week is unlocked, or manual refresh invalidates subsequent weeks if value changed. Do not invalidate if unchanged.

## Checklist
- [x] Locate cumulative overtime calculation trigger and cache lookup
- [x] Identify week lock handling and refresh invalidation behavior
- [x] Propose or implement logic to skip recalculation when cached + locked + no refresh

## Implementation

### Changes to `src/server/clockifyServerFns.ts` - `getCumulativeOvertime`:
1. Returns cached `cumulativeOvertimeSeconds` immediately if week is committed (locked) and has cached value
2. Uses cached weekly overtime values from `cachedWeeklySums` instead of hitting Clockify API
3. Finds the latest committed week with cached cumulative overtime as a starting point
4. Only calls Clockify API for weeks without any cached overtime data
5. Stores calculated cumulative overtime in cache for future lookups

### Changes to `src/server/cacheServerFns.ts` - `refreshCommittedWeek`:
1. If overtime changes after refresh, invalidates (sets to null) `cumulativeOvertimeSeconds` for all subsequent weeks
2. Does NOT invalidate if overtime is unchanged
3. Returns `cumulativeOvertimeInvalidated` flag in response

### Optimization Strategy:
- `cumulativeOvertime(week N) = sum(overtimeSeconds for weeks 1 to N)`
- If week N-1 has cached cumulative overtime AND is committed, use it as starting point
- Only process weeks from that point forward using cached weekly overtime values
- Avoids N API calls by using cached data
