---
# time.bjesuiter.de-wwkk
title: Consolidate console.error with logger usage
status: todo
type: task
created_at: 2026-01-21T23:41:24Z
updated_at: 2026-01-21T23:41:24Z
---

Some code uses console.error directly instead of the logger utility.

## Issues
- src/server/configServerFns.ts line 89 uses console.error
- src/lib/logger.ts provides consistent logging interface
- Mixing console methods with logger creates inconsistency

## Checklist
- [ ] Search for all uses of console.error in src/server/
- [ ] Replace with logger.error()
- [ ] Search for other console methods (console.log, console.warn)
- [ ] Replace with appropriate logger methods
- [ ] Verify logging still works correctly
- [ ] Document logging patterns in AGENTS.md if needed