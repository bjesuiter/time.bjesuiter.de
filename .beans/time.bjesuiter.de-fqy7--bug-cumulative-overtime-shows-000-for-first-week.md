---
# time.bjesuiter.de-fqy7
title: 'Bug: Cumulative overtime shows +0:00 for first week'
status: completed
type: bug
priority: high
created_at: 2026-01-19T21:22:36Z
updated_at: 2026-01-19T21:33:23Z
---

## Problem
The cumulative overtime display shows '+0:00' and '0 weeks' for the first week.

## Root Cause: toISODate uses UTC conversion

**File**: `src/lib/date-utils.ts:16-18`
```typescript
export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}
```

This converts to UTC, shifting dates backwards by 1 day in UTC+1/+2 timezones.

**Example**:
- Local: Mon Sep 29 2025 00:00:00 GMT+0200
- `toISOString()`: 2025-09-28T22:00:00.000Z
- `toISODate()`: **2025-09-28** (should be 2025-09-29)

### Cascading effect:
1. `getWeeksForMonth` generates weeks starting on WRONG dates
2. Oct 2025 weeks become: Sep 21-27, Sep 28-Oct 4, Oct 5-11...
3. Sep 28 should be MONDAY Sep 29 if week starts on Monday
4. This creates frontend/backend mismatch

### Debug output:
```
startDateStr: '2025-10-01'
data.currentWeekStartDate: '2025-09-28'  # From buggy toISODate
currentWeekStart: '2025-09-21T22:00:00.000Z'  # Wrong!
condition (first <= current): false
```

## Checklist
- [ ] Fix `toISODate` to use local timezone
- [ ] Verify week generation produces correct Monday-starting weeks
- [ ] Test cumulative overtime now shows +4:30 for first week
- [ ] See bean 'Migrate to date-fns' for long-term fix