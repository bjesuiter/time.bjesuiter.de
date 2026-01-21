---
# time.bjesuiter.de-uwa2
title: Create hooks directory for custom React hooks
status: todo
type: task
created_at: 2026-01-21T23:42:57Z
updated_at: 2026-01-21T23:42:57Z
---

Custom React hooks may be embedded in components. Consider extracting to a dedicated hooks directory.

## Current State
- Hooks are likely embedded in component files
- No src/hooks/ directory exists

## Checklist
- [ ] Search for custom hooks in components
- [ ] Identify reusable hook patterns
- [ ] Create src/hooks/ directory
- [ ] Extract custom hooks to dedicated files
- [ ] Update component imports
- [ ] Consider hook naming conventions (use*.ts)
- [ ] Run tests to verify hook extraction