---
# time.bjesuiter.de-7apm
title: Discrepancy UI (warning banner, detailed view)
status: todo
type: feature
priority: normal
created_at: 2026-01-19T18:52:50Z
updated_at: 2026-01-22T11:08:34Z
parent: time.bjesuiter.de-lbhw
---

User interface for viewing and acknowledging discrepancies.

## Backend Status
**DONE** - The following server-side components exist:
- `weeklyDiscrepancies` table in `src/db/schema/cache.ts`
- `getUnresolvedDiscrepancies()` server function
- `resolveDiscrepancy()` server function (accepts/dismisses)
- Discrepancies are auto-created when cached weekly sums change

## UI Requirements (TODO)
- Warning banner when unacknowledged discrepancies exist
- Detailed view showing:
  - Week affected
  - Old vs new values
  - Difference in hours
  - When detected
- Acknowledge action to dismiss
- History of past discrepancies

## Checklist
- [ ] Add discrepancy banner component to dashboard
- [ ] Create discrepancy detail modal/view
- [ ] Wire up acknowledge/dismiss actions to resolveDiscrepancy()
- [ ] Add discrepancy history section (optional)