---
# time.bjesuiter.de-e5mn
title: Fix overtime calculation for partial current week
status: todo
type: bug
priority: high
created_at: 2026-01-19T22:06:14Z
updated_at: 2026-01-19T22:06:14Z
---

## Issue
Current week (week 3, Monday 2026-01-19) shows overtime as -20:00, but it should be 0 since only Monday has passed.

**Expected behavior**:
- Current week overtime: 0 (we're only on Monday)
- Cumulative overtime: -10 (from previous week)

**Actual behavior**:
- Current week overtime: -20 (full week calculated as if complete)
- Cumulative overtime: -30

## Root Cause
The overtime calculation is likely not accounting for the current day when calculating the current week's target hours. It should only calculate target hours up to the current day of the week.