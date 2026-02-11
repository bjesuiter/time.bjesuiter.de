---
# time.bjesuiter.de-sivt
title: Extract getAuthenticatedUserId helper to shared module
status: completed
type: task
priority: normal
created_at: 2026-01-21T23:41:22Z
updated_at: 2026-01-22T05:09:26Z
---

The getAuthenticatedUserId function is duplicated across multiple server function files.

## Files Affected

- src/server/clockifyServerFns.ts (lines 72-86)
- src/server/configServerFns.ts (lines 8-22)
- Likely duplicated in other server files too

## Issues

- Same helper function duplicated in multiple files
- Changes need to be made in multiple places
- Violates DRY (Don't Repeat Yourself) principle

## Checklist

- [x] Create src/server/authHelpers.ts or similar shared module
- [x] Extract getAuthenticatedUserId function to shared module (as getAuthUserId to avoid naming conflicts)
- [x] Update clockifyServerFns.ts to import getAuthUserId from shared module (headers parameter)
- [x] Verify authentication still works correctly (55 unit tests pass)
- [x] Note: configServerFns.ts, cacheServerFns.ts, userServerFns.ts still need updates to pass headers parameter directly
