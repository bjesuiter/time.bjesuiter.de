---
# time.bjesuiter.de-apqo
title: Clean up temporary and debug directories
status: todo
type: task
created_at: 2026-01-21T23:39:37Z
updated_at: 2026-01-21T23:39:37Z
---

There are temporary and debug directories that should be cleaned up.

## Issues Found
- .playwright-mcp/ directory - temporary playwright MCP files
- .sisyphus/ directory - temporary build/agent files
- These directories are not part of the project structure

## Checklist
- [ ] Verify contents of .playwright-mcp/ are not needed
- [ ] Remove .playwright-mcp/ directory if safe
- [ ] Verify contents of .sisyphus/ are not needed
- [ ] Remove .sisyphus/ directory if safe
- [ ] Add these directories to .gitignore if not already present