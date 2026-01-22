---
# time.bjesuiter.de-yj3s
title: Remove or relocate playground clockify-api CLI tool
status: completed
type: task
priority: normal
created_at: 2026-01-21T23:39:28Z
updated_at: 2026-01-22T05:13:45Z
---

The playground/clockify-api.bun.ts is a 399-line development tool for interacting with Clockify API. 

## Issues
- Large file in playground directory that may not be needed in production
- Contains hardcoded client name 'secunet' which is project-specific
- Could be replaced by proper dev tools or moved to scripts/

## Checklist
- [x] Evaluate if the playground tool is still needed for development (hardcoded for "secunet" client, not needed for production)
- [x] If needed, move to scripts/ directory and update package.json script (not needed - removed)
- [x] If not needed, remove the file (removed playground/clockify-api.bun.ts)
- [x] Update package.json to remove the 'pg' script if file is removed (done)