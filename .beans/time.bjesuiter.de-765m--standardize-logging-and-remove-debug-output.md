---
# time.bjesuiter.de-765m
title: Standardize logging and remove debug output
status: todo
type: task
created_at: 2026-01-20T22:31:02Z
updated_at: 2026-01-20T22:31:02Z
---

## Summary
Add structured logging utility and remove/guard debug console statements.

## Checklist
- [ ] Add logger helper (dev/prod modes)
- [ ] Replace server `console.error` calls with logger
- [ ] Remove or guard debug log in `clockifyServerFns.ts`
- [ ] Make migration logs conditional on dev/test