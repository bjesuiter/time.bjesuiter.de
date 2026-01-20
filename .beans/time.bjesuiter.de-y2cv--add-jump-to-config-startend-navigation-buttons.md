---
# time.bjesuiter.de-y2cv
title: Add jump to config start/end navigation buttons
status: completed
type: task
priority: normal
created_at: 2026-01-20T20:41:58Z
updated_at: 2026-01-20T20:45:36Z
---

## Summary
Add |« and »| buttons to jump to the start and end of a tracked projects config period.

## Checklist
- [x] Add `configValidFrom` and `configValidUntil` to `getWeeklyTimeSummary` response
- [x] Add new props to `WeekNavigationBar` component
- [x] Add jump handlers in `WeekNavigationBar`
- [x] Add |« (jump to start) button on far left
- [x] Add »| (jump to end) button on far right
- [x] Pass props from `index.tsx` to `WeekNavigationBar`
- [x] Build passes
- [x] Visual verification in browser