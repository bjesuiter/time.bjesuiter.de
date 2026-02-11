---
# time.bjesuiter.de-apqo
title: Clean up temporary and debug directories
status: completed
type: task
priority: normal
created_at: 2026-01-21T23:39:37Z
updated_at: 2026-01-22T01:13:52Z
---

There are temporary and debug directories that should be cleaned up.

## Issues Found

- .playwright-mcp/ directory - temporary playwright MCP files
- .sisyphus/ directory - temporary build/agent files
- These directories are not part of the project structure

## Checklist

- [x] Verify contents of .playwright-mcp/ are not needed
- [x] Remove .playwright-mcp/ directory if safe
- [x] Verify contents of .sisyphus/ are not needed
- [x] Remove .sisyphus/ directory if safe
- [x] Add these directories to .gitignore if not already present
