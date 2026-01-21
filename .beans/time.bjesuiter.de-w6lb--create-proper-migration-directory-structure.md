---
# time.bjesuiter.de-w6lb
title: Create proper migration directory structure
status: todo
type: task
created_at: 2026-01-21T23:41:26Z
updated_at: 2026-01-21T23:41:26Z
---

SQL migration files are in drizzle/ directory but should follow better organization.

## Current State
- drizzle/ contains 4 SQL files (0000_*.sql, 0001_*.sql, 0002_*.sql, 0003_*.sql)
- drizzle/meta/ subdirectory exists
- No dedicated migrations/ directory

## Issues
- Not following common Drizzle migration patterns
- Files have unclear naming (random names like 'large_cobalt_man')

## Checklist
- [ ] Create dedicated migrations/ or drizzle/migrations/ directory
- [ ] Move SQL files to proper location with clearer names
- [ ] Update drizzle.config.ts if needed
- [ ] Document migration process in README or AGENTS.md
- [ ] Verify migration commands still work