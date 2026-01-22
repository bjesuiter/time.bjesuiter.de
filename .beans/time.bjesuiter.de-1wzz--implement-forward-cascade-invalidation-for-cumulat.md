---
# time.bjesuiter.de-1wzz
title: Implement forward cascade invalidation for cumulative overtime
status: todo
type: task
priority: high
created_at: 2026-01-22T12:11:12Z
updated_at: 2026-01-22T12:11:12Z
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

## Checklist
- [ ] Add cascade invalidation logic after cumulative overtime calculation
- [ ] Only invalidate forward in time, never backward
- [ ] Only clear cumulativeOvertimeSeconds, not weeklyOvertime data
- [ ] Test: refresh week 3 -> weeks 4,5,6 cumulative cleared but weekly data intact