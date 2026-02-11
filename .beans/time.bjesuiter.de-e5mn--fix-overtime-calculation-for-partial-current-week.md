---
# time.bjesuiter.de-e5mn
title: Fix overtime calculation for partial current week
status: completed
type: bug
priority: high
created_at: 2026-01-19T22:06:14Z
updated_at: 2026-01-20T17:08:18Z
---

## Fix Summary

Fixed overtime calculation for partial current week by checking if days are in the future before counting them as eligible workdays.

## Changes Made

1. **`src/server/clockifyServerFns.ts`** - Added `isFutureDay` check in `getCumulativeOvertime` function to skip future days when counting eligible workdays

2. **`src/lib/overtime-utils.ts`** - Added optional `referenceDate` parameter to `calculateWeeklyOvertime` function and added `isFutureDay` check to skip future days

3. **`tests/unit/overtime-utils.test.ts`** - Updated tests to pass reference dates for full week tests, added new test `overtime-018` to verify partial week behavior

## Behavior

- Past weeks: Full 5 workdays counted as expected (no change)
- Current partial week: Only days up to today are counted
- Example: On Monday of current week, only 1 day of expected hours (5h), not full week (25h)
