---
# time.bjesuiter.de-54e4
title: Clean up build output directories
status: todo
type: task
created_at: 2026-01-21T23:39:35Z
updated_at: 2026-01-21T23:39:35Z
---

There are multiple build output directories that should be cleaned up or added to .gitignore.

## Issues Found
- .output-e2e/ directory exists
- .output-e2e-4/ directory exists
- These appear to be test build artifacts
- Should be cleaned up or properly ignored

## Checklist
- [ ] Remove .output-e2e directory
- [ ] Remove .output-e2e-4 directory
- [ ] Update .gitignore to include .output-e2e* pattern if not present
- [ ] Verify .tanstack is properly ignored