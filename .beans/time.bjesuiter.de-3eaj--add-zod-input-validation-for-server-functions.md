---
# time.bjesuiter.de-3eaj
title: Add Zod input validation for server functions
status: todo
type: task
priority: normal
created_at: 2026-01-20T22:29:01Z
updated_at: 2026-01-21T22:45:02Z
---

## Summary
Replace identity `inputValidator` usage with Zod schemas for all server functions.

## Scope Assessment
29 input validators across 4 files:
- userServerFns.ts: 2 validators
- cacheServerFns.ts: 13 validators
- configServerFns.ts: 9 validators
- clockifyServerFns.ts: 5 validators

## Checklist
- [ ] Create shared Zod schemas for user/config/clockify/cache inputs
- [ ] Update `inputValidator` calls to parse with Zod
- [ ] Add helpful validation error messages for common fields
- [ ] Verify server function callers handle validation errors

## Notes
Large refactoring scope - consider splitting into smaller tasks per file.