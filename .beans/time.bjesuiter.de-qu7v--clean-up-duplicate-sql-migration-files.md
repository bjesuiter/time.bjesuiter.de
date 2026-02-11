---
# time.bjesuiter.de-qu7v
title: Clean up duplicate SQL migration files
status: completed
type: task
priority: normal
created_at: 2026-01-21T23:41:15Z
updated_at: 2026-01-22T01:34:28Z
---

There are duplicate SQL migration files in multiple directories.

## Issues Found

- drizzle/ directory contains 4 SQL files (0000*\*.sql, 0001*_.sql, 0002\__.sql, 0003\_\*.sql)
- .output/server/drizzle/ directory contains identical 4 SQL files
- These appear to be Drizzle migration artifacts

## Checklist

- [x] Remove SQL files from .output/server/drizzle/ directory
- [x] Keep SQL files in drizzle/ directory only
- [x] Add .output/\*\*/drizzle/ to .gitignore if not present (covered by .output)
- [x] Verify migration still works with clean structure
