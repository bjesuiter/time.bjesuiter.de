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
- [ ] Add invalidatedAt indexes to cache tables
- [ ] Add lookup index for config chronicle user/type
- [ ] Generate and apply migration