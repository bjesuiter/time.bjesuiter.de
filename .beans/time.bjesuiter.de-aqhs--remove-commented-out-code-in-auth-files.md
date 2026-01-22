---
# time.bjesuiter.de-aqhs
title: Remove commented-out code in auth files
status: completed
type: task
priority: normal
created_at: 2026-01-21T23:39:39Z
updated_at: 2026-01-22T01:26:40Z
---

There is commented-out code in authentication files that should be removed for cleaner code.

## Files Affected
1. src/lib/auth/auth.ts (lines 19-24):
   - Commented-out Google OAuth configuration
   
2. src/client/auth-client.ts (line 8):
   - Commented-out baseURL configuration

## Checklist
- [x] Remove commented Google OAuth code from src/lib/auth/auth.ts
- [x] Remove commented baseURL from src/client/auth-client.ts
- [x] Verify no functionality is broken after removal
- [x] If Google OAuth is planned for future, create a dedicated feature bean instead