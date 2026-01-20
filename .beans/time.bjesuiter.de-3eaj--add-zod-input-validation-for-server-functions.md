---
# time.bjesuiter.de-3eaj
title: Add Zod input validation for server functions
status: todo
type: task
created_at: 2026-01-20T22:29:01Z
updated_at: 2026-01-20T22:29:01Z
---

## Summary
Replace identity `inputValidator` usage with Zod schemas for all server functions.

## Checklist
- [ ] Create shared Zod schemas for user/config/clockify/cache inputs
- [ ] Update `inputValidator` calls to parse with Zod
- [ ] Add helpful validation error messages for common fields
- [ ] Verify server function callers handle validation errors