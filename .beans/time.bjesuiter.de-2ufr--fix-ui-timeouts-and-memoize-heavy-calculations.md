---
# time.bjesuiter.de-2ufr
title: Fix UI timeouts and memoize heavy calculations
status: todo
type: task
created_at: 2026-01-20T22:31:02Z
updated_at: 2026-01-20T22:31:02Z
---

## Summary
Add cleanup for setTimeout-based state resets and memoize heavy UI calculations.

## Checklist
- [ ] Replace setTimeout resets with useEffect cleanup in dashboard/settings
- [ ] Add useMemo for weekly totals and overtime calculations
- [ ] Verify no setState-after-unmount warnings