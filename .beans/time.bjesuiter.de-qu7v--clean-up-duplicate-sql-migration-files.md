---
# time.bjesuiter.de-qu7v
title: Clean up duplicate SQL migration files
status: todo
type: task
created_at: 2026-01-21T23:41:15Z
updated_at: 2026-01-21T23:41:15Z
---

There are duplicate SQL migration files in multiple directories.

## Issues Found
- drizzle/ directory contains 4 SQL files (0000_*.sql, 0001_*.sql, 0002_*.sql, 0003_*.sql)
- .output/server/drizzle/ directory contains identical 4 SQL files
- These appear to be Drizzle migration artifacts

## Checklist
- [ ] Remove SQL files from .output/server/drizzle/ directory
- [ ] Keep SQL files in drizzle/ directory only
- [ ] Add .output/**/drizzle/ to .gitignore if not present
- [ ] Verify migration still works with clean structure