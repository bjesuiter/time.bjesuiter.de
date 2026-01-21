---
# time.bjesuiter.de-y01q
title: Add missing database indexes
status: completed
type: task
priority: normal
created_at: 2026-01-20T22:31:02Z
updated_at: 2026-01-21T22:42:32Z
---

## Summary
Add indexes for auth and cache tables based on query patterns.

## Checklist
- [x] Add indexes to better-auth session/account userId
  - `session.userId` - queried when looking up user sessions
  - `account.userId` - queried when looking up user accounts
- [x] Add invalidatedAt indexes to cache tables (27 queries use `isNull(invalidatedAt)`)
  - `cachedDailyProjectSums.invalidatedAt`
  - `cachedWeeklySums.invalidatedAt`
- [x] Add lookup index for config chronicle user/type
  - Already exists: `config_chronic_temporal_idx` on `(user_id, config_type, valid_from, valid_until)`
- [x] Generate and apply migration (0003_lame_lady_ursula.sql)