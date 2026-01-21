---
# time.bjesuiter.de-sivt
title: Extract getAuthenticatedUserId helper to shared module
status: todo
type: task
created_at: 2026-01-21T23:41:22Z
updated_at: 2026-01-21T23:41:22Z
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
- [ ] Create src/server/authHelpers.ts or similar shared module
- [ ] Extract getAuthenticatedUserId function to shared module
- [ ] Update all server files to import from shared module
- [ ] Verify authentication still works correctly
- [ ] Remove duplicate implementations