---
# time.bjesuiter.de-9qoq
title: Implement caching tables
status: todo
type: task
priority: high
created_at: 2026-01-19T18:52:13Z
updated_at: 2026-01-19T18:52:13Z
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

## Schema Reference
See ARCHITECTURE.md Database Schema section for full field definitions.

## Context
Part of Phase 4 - Caching Layer & Optimization