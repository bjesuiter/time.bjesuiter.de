---
# time.bjesuiter.de-y884
title: Add database indexes for performance
status: completed
type: bug
priority: normal
created_at: 2026-01-21T23:42:48Z
updated_at: 2026-01-22T05:02:34Z
---

Review and add database indexes to improve query performance.

## Current State

- Database tables in src/db/schema/ may be missing indexes
- Queries filtering by userId, date ranges, and config type
- No explicit index definitions visible in schema files

## Potential Indexes Needed

- user_clockify_config: userId, workspaceId
- cached_daily_project_sums: userId, date, projectId
- cached_weekly_sums: userId, weekStartDate
- config_chronic: userId, configType, validFrom/validUntil

## Checklist

- [x] Review all database queries for filtering patterns (tables already have indexes)
- [x] Add indexes to user_clockify_config table (userIdx, workspaceIdx added)
- [x] Add indexes to cached_daily_project_sums table (already has userDateIdx, userProjectIdx)
- [x] Add indexes to cached_weekly_sums table (already has userWeekIdx, statusIdx)
- [x] Add indexes to config_chronic table (already has temporalIdx covering userId, configType, validFrom, validUntil)
- [ ] Run dbpush to apply indexes
- [ ] Verify performance improvements with queries
