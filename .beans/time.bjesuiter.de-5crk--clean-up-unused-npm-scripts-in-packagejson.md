---
# time.bjesuiter.de-5crk
title: Clean up unused npm scripts in package.json
status: todo
type: task
created_at: 2026-01-21T23:39:48Z
updated_at: 2026-01-21T23:39:48Z
---

Review and remove unused or redundant npm scripts from package.json.

## Current Scripts to Review
- 'pg': runs playground/clockify-api.bun.ts (may be removed if playground is cleaned up)
- 'dbseed': drizzle-seed script (check if used)
- 'testw:unit': watch mode for unit tests (may not be needed)
- 'testw:integration': watch mode for integration tests (may not be needed)

## Checklist
- [ ] Identify which scripts are actually used
- [ ] Remove 'pg' script if playground tool is removed
- [ ] Remove 'dbseed' if not used
- [ ] Evaluate if watch mode scripts are needed
- [ ] Update AGENTS.md if scripts change