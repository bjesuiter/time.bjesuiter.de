---
# time.bjesuiter.de-rxyc
title: Fix partial week overtime calculation at config start
status: completed
type: bug
priority: high
created_at: 2026-01-19T21:00:28Z
updated_at: 2026-01-19T21:04:06Z
---

When a configuration timeframe starts mid-week, the expected hours calculation should only count working days within the tracking period.

## Problem
- Config starts Oct 1, 2025 (Wednesday)
- Week displayed is Sep 28 - Oct 4
- Sun/Mon/Tue are BEFORE config start date - should not count toward expected hours
- Currently shows Expected: 25:00 (full week)
- Should show Expected: 15:00 (only Wed/Thu/Fri = 3 working days * 5h)

## Solution
- Pass the config start date (cumulativeOvertimeStartDate) to overtime calculation
- For each day in the week, check if it's before the config start date
- Exclude pre-config days from expected hours calculation

## Checklist
- [ ] Update getWeeklyTimeSummary to include config start date in response
- [ ] Update OvertimeSummary component to accept config start date
- [ ] Modify calculateWeeklyOvertime to exclude days before config start
- [ ] Update tests for partial week scenarios