---
# time.bjesuiter.de-y01q
title: Add missing database indexes
status: todo
type: task
created_at: 2026-01-20T22:31:02Z
updated_at: 2026-01-20T22:31:02Z
---

## Summary
Add indexes for auth and cache tables based on query patterns.

## Checklist
- [ ] Add indexes to better-auth session/account userId
  - `session.userId` - queried when looking up user sessions
  - `account.userId` - queried when looking up user accounts
- [ ] Add invalidatedAt indexes to cache tables (27 queries use `isNull(invalidatedAt)`)
  - `cachedDailyProjectSums.invalidatedAt`
  - `cachedWeeklySums.invalidatedAt`
- [x] Add lookup index for config chronicle user/type
  - Already exists: `config_chronic_temporal_idx` on `(user_id, config_type, valid_from, valid_until)`
- [ ] Generate and apply migration