---
# time.bjesuiter.de-hdse
title: Create shared utilities directory
status: todo
type: task
created_at: 2026-01-21T23:42:55Z
updated_at: 2026-01-21T23:42:55Z
---

Utility functions are scattered across lib/ and could be better organized.

## Current Utility Files
- src/lib/date-utils.ts (408 lines)
- src/lib/overtime-utils.ts (129 lines)
- src/lib/clockify/client.ts (347 lines)
- src/lib/clockify/api-instance.ts
- src/lib/clockify/reports-api-instance.ts
- src/lib/logger.ts
- src/lib/auth/auth.ts (auth configuration)

## Issues
- Mix of utilities, API clients, and configuration
- No clear separation between different types of utilities
- Harder to discover and reuse utilities

## Checklist
- [ ] Create src/utils/ directory
- [ ] Move date-utils.ts to src/utils/date-utils.ts
- [ ] Move overtime-utils.ts to src/utils/overtime-utils.ts
- [ ] Organize Clockify clients under src/api/ or src/lib/clockify/
- [ ] Keep logger and auth in lib/ as they're framework/configuration related
- [ ] Update all imports across codebase
- [ ] Run tests to verify reorganization