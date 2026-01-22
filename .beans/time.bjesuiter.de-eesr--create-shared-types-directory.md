---
# time.bjesuiter.de-eesr
title: Create shared types directory
status: scrapped
type: task
priority: normal
created_at: 2026-01-21T23:42:52Z
updated_at: 2026-01-22T11:08:20Z
---

Type definitions are scattered across multiple files. Consider consolidating to a shared types directory.

## Files with Type Definitions
- src/db/types/customUint8Array.ts
- src/db/types/customIsoDate.ts
- src/lib/clockify/types.ts (268 lines)
- Server function files with export interfaces (e.g., configServerFns.ts)

## Issues
- Types not centrally located
- Difficult to find and reuse types
- Inconsistent organization

## Checklist
- [ ] Create src/types/ or src/shared/types/ directory
- [ ] Move custom DB types from src/db/types/ to shared location
- [ ] Consider moving Clockify types to shared location
- [ ] Move shared interfaces from server files to types directory
- [ ] Update all imports across codebase
- [ ] Run tests to verify type consolidation