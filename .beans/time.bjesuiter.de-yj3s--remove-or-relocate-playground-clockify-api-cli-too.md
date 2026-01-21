---
# time.bjesuiter.de-yj3s
title: Remove or relocate playground clockify-api CLI tool
status: todo
type: task
created_at: 2026-01-21T23:39:28Z
updated_at: 2026-01-21T23:39:28Z
---

The playground/clockify-api.bun.ts is a 399-line development tool for interacting with Clockify API. 

## Issues
- Large file in playground directory that may not be needed in production
- Contains hardcoded client name 'secunet' which is project-specific
- Could be replaced by proper dev tools or moved to scripts/

## Checklist
- [ ] Evaluate if the playground tool is still needed for development
- [ ] If needed, move to scripts/ directory and update package.json script
- [ ] If not needed, remove the file
- [ ] Update package.json to remove the 'pg' script if file is removed