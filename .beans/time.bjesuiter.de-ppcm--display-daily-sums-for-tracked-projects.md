---
# time.bjesuiter.de-ppcm
title: Display daily sums for tracked projects
status: completed
type: feature
priority: high
created_at: 2026-01-19T18:51:54Z
updated_at: 2026-01-19T19:08:50Z
parent: time.bjesuiter.de-1ft8
---

Show time entries summed by day for each tracked project in the weekly table.

## Requirements

- One row per tracked project
- Column per day (Mon-Sun or Sun-Sat based on user's weekStart setting)
- Show hours:minutes format
- Sum from cached_daily_project_sums or live Clockify data

## Checklist

- [x] Create server function `getWeeklyTimeSummary` in clockifyServerFns.ts
- [x] Create `WeeklyTimeTable` component in src/components/
- [x] Add time formatting utility (seconds to HH:MM)
- [x] Update dashboard to use WeeklyTimeTable with TanStack Query
- [x] Handle weekStart setting (MONDAY vs SUNDAY)
- [x] Verified build passes and integration tests pass

## Implementation Summary

- Added `getWeeklyTimeSummary` server function that fetches user config, tracked projects, and calls Clockify API
- Created `WeeklyTimeTable` component with responsive table layout
- Integrated into dashboard with TanStack Query for data fetching
- Shows loading state, error states with setup guidance, and time data when available

## Context

Part of Phase 2 - Clockify Integration & Basic Display
