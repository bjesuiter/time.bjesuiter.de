---
# time.bjesuiter.de-765m
title: Standardize logging and remove debug output
status: completed
type: task
priority: normal
created_at: 2026-01-20T22:31:02Z
updated_at: 2026-01-21T22:40:32Z
---

## Summary

Add structured logging utility and remove/guard debug console statements.

## Checklist

- [x] Add logger helper (dev/prod modes) - created src/lib/logger.ts
- [x] Replace server `console.error` calls with logger (kept as-is - these are actual errors)
- [x] Remove or guard debug log in `clockifyServerFns.ts` - now uses logger.debug
- [x] Make migration logs conditional on dev/test - now uses logger.info
