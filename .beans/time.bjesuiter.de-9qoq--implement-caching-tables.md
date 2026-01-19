---
# time.bjesuiter.de-9qoq
title: Implement caching tables
status: completed
type: task
priority: high
created_at: 2026-01-19T18:52:13Z
updated_at: 2026-01-19T20:50:36Z
parent: time.bjesuiter.de-v3k9
---

Create database tables for caching daily and weekly time sums.

## Tables to Create
1. **cached_daily_project_sums**
   - userId, date, projectId, projectName, seconds, clientId
   - calculatedAt, invalidatedAt timestamps

2. **cached_weekly_sums**
   - userId, weekStart, weekEnd, clientId
   - totalSeconds, regularHoursBaseline, overtimeSeconds
   - cumulativeOvertimeSeconds, configSnapshotId
   - status (pending/committed), committedAt
   - calculatedAt, invalidatedAt

3. **weekly_discrepancies**
   - userId, weekStart
   - originalTotalSeconds, newTotalSeconds, differenceSeconds
   - detectedAt, resolvedAt, resolution

## Checklist
- [x] Create cached_daily_project_sums table schema
- [x] Create cached_weekly_sums table schema
- [x] Create weekly_discrepancies table schema
- [x] Add appropriate indexes
- [x] Register schemas in db index
- [x] Generate and apply migration

## Context
Part of Phase 4 - Caching Layer & Optimization