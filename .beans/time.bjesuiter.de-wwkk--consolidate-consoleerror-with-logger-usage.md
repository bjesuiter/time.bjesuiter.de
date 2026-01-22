---
# time.bjesuiter.de-wwkk
title: Consolidate console.error with logger usage
status: completed
type: task
priority: normal
created_at: 2026-01-21T23:41:24Z
updated_at: 2026-01-22T04:50:28Z
---

Some code uses console.error directly instead of the logger utility.

## Issues
- src/server/configServerFns.ts line 89 uses console.error
- src/lib/logger.ts provides consistent logging interface
- Mixing console methods with logger creates inconsistency

## Checklist
- [x] Search for all uses of console.error in src/server/
- [x] Replace with logger.error()
- [x] Search for other console methods (console.log, console.warn)
- [x] Replace with appropriate logger methods
- [x] Verify logging still works correctly
- [x] Document logging patterns in AGENTS.md if needed (not needed, logger is standard)