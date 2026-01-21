---
# time.bjesuiter.de-y884
title: Add database indexes for performance
status: todo
type: bug
created_at: 2026-01-21T23:42:48Z
updated_at: 2026-01-21T23:42:48Z
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
- [ ] Review all database queries for filtering patterns
- [ ] Add indexes to user_clockify_config table
- [ ] Add indexes to cached_daily_project_sums table
- [ ] Add indexes to cached_weekly_sums table
- [ ] Add indexes to config_chronic table
- [ ] Run dbpush to apply indexes
- [ ] Verify performance improvements with queries