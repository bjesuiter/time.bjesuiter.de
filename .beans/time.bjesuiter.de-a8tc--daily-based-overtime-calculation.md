---
# time.bjesuiter.de-a8tc
title: Daily-based overtime calculation
status: todo
type: feature
priority: high
created_at: 2026-01-19T18:52:02Z
updated_at: 2026-01-19T18:52:02Z
parent: time.bjesuiter.de-1ft8
---

Calculate overtime based on working days vs weekends.

## Requirements
- Use regularHoursPerWeek and workingDaysPerWeek from user config
- Calculate expected hours per working day
- Weekend work = automatic overtime
- Display overtime per week

## Example
- 25h/week, 5 days = 5h/day expected
- Mon 6h = 1h overtime
- Sat 3h = 3h overtime (all weekend work)

## Context
Part of Phase 2 - Clockify Integration & Basic Display