---
# time.bjesuiter.de-ppcm
title: Display daily sums for tracked projects
status: todo
type: feature
priority: high
created_at: 2026-01-19T18:51:54Z
updated_at: 2026-01-19T18:51:54Z
parent: time.bjesuiter.de-1ft8
---

Show time entries summed by day for each tracked project in the weekly table.

## Requirements
- One row per tracked project
- Column per day (Mon-Sun or Sun-Sat based on user's weekStart setting)
- Show hours:minutes format
- Sum from cached_daily_project_sums or live Clockify data

## Dependencies
- Tracked projects from config_chronic
- Weekly table component exists

## Context
Part of Phase 2 - Clockify Integration & Basic Display