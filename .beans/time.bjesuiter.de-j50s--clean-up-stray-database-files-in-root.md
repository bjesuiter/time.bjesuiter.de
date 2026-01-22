---
# time.bjesuiter.de-j50s
title: Clean up stray database files in root
status: completed
type: task
priority: normal
created_at: 2026-01-21T23:39:33Z
updated_at: 2026-01-22T00:25:25Z
---

There is a sqlite.db file in the project root that is not the proper database location.

## Issues
- sqlite.db in root (should be in local/db.sqlite)
- Project uses DATABASE_URL="file:./local/db.sqlite" in .env.example
- Stray database files can cause confusion and use extra disk space

## Checklist
- [x] Remove sqlite.db from root directory if it exists
- [x] Add sqlite.db to .gitignore if not already there (it is)
- [x] Verify local/db.sqlite is the correct database file