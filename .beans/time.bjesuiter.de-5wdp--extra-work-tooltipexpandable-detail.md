---
# time.bjesuiter.de-5wdp
title: Extra work tooltip/expandable detail
status: completed
type: feature
priority: low
created_at: 2026-01-19T18:52:36Z
updated_at: 2026-01-19T20:45:44Z
parent: time.bjesuiter.de-lbhw
---

Show which projects make up the Extra Work row.

## Requirements
- Tooltip or expandable section on Extra Work row
- List individual projects and their hours
- Grouped by day or as weekly total
- Help users understand untracked time

## Checklist
- [x] Update Clockify API response to include extra work project breakdown
- [x] Add tooltip or expandable detail to Extra Work row in WeeklyTimeTable
- [x] Show project names and hours that make up extra work

## Implementation Notes
- Added third API call (in parallel) to fetch all projects per day
- Filter out tracked projects to identify extra work projects
- Tooltip shows on hover over Extra Work cells with project breakdown
- Tooltip includes client name prefix for consistency

## Context
Part of Phase 5 - Polish & Features
