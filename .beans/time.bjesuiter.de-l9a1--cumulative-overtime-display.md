---
# time.bjesuiter.de-l9a1
title: Cumulative overtime display
status: completed
type: feature
priority: normal
created_at: 2026-01-19T18:52:34Z
updated_at: 2026-01-19T19:52:31Z
parent: time.bjesuiter.de-lbhw
---

Show running total of overtime from cumulativeOvertimeStartDate.

## Requirements

- Use cumulativeOvertimeStartDate from user_clockify_config
- Sum all overtime from that date to current week
- Display prominently in UI (header or sidebar)
- Update when viewing different weeks

## Checklist

- [x] Create server function to calculate cumulative overtime
- [x] Add API to fetch all weeks from start date to current
- [x] Create CumulativeOvertimeSummary component
- [x] Integrate into dashboard UI
- [x] Handle edge cases (no start date, loading states)

## Implementation

- Added getCumulativeOvertime server function that iterates through all weeks
- Calculates overtime for each week using the same logic as weekly display
- Created CumulativeOvertimeSummary component with:
  - Loading state with spinner
  - Error display
  - "No start date configured" message
  - Green/red gradient based on positive/negative overtime
  - Shows total overtime, start date, and weeks count

## Context

Part of Phase 5 - Polish & Features
