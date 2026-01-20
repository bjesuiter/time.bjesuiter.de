---
# time.bjesuiter.de-4kid
title: Implement discrepancy tracking
status: in-progress
type: feature
priority: normal
created_at: 2026-01-19T18:52:22Z
updated_at: 2026-01-20T22:14:40Z
parent: time.bjesuiter.de-v3k9
blocking:
    - time.bjesuiter.de-nnlg
    - time.bjesuiter.de-7apm
---

Track and alert when committed week data changes.

## Requirements
1. **weekly_discrepancies table**
   - weekStart, weekEnd, detectedAt
   - oldTotalSeconds, newTotalSeconds
   - oldOvertimeSeconds, newOvertimeSeconds
   - differenceTotalSeconds, differenceOvertimeSeconds
   - acknowledged, acknowledgedAt

2. **Detection Logic**
   - When manually refreshing a committed week
   - Compare old vs new values
   - If different → create discrepancy record

3. **UI Warnings**
   - Show warning when discrepancy exists
   - Acknowledge action to dismiss

## Context
Part of Phase 4 - Caching Layer & Optimization

## Checklist
- [x] Schema: weekly_discrepancies table (already exists)
- [ ] Server function: `refreshCommittedWeek` - refresh committed week with discrepancy detection
- [ ] Server function: `getUnresolvedDiscrepancies` - get unresolved discrepancies for user
- [ ] Server function: `resolveDiscrepancy` - resolve a discrepancy (accept/dismiss)
- [ ] Run lsp_diagnostics to verify no type errors