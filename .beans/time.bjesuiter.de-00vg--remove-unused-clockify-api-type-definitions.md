---
# time.bjesuiter.de-00vg
title: Remove unused Clockify API type definitions
status: todo
type: task
priority: normal
created_at: 2026-01-21T23:42:42Z
updated_at: 2026-01-22T04:56:00Z
---

The src/lib/clockify/types.ts file contains many type definitions that may not be fully used.

## Issues
- ClockifyUserSettings interface has many unused fields (20+ properties)
- ClockifyWorkspaceSettings interface is very large (20+ properties)
- ClockifyProject interface has many unused properties (estimate, timeEstimate, budgetEstimate, etc.)
- These are generated from Clockify API but most fields are never used in the app

## Checklist
- [ ] Audit which Clockify types are actually used in the codebase
- [ ] Remove unused fields from ClockifyUserSettings
- [ ] Remove unused fields from ClockifyWorkspaceSettings
- [ ] Remove unused fields from ClockifyProject
- [ ] Remove unused interface definitions entirely
- [ ] Run tests to verify type cleanup
- [ ] Consider using Pick<> or Partial<> for partial type usage if needed