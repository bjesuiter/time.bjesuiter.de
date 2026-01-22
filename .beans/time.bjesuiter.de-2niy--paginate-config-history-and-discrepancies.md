---
# time.bjesuiter.de-2niy
title: Paginate config history and discrepancies
status: scrapped
type: task
priority: normal
created_at: 2026-01-20T22:31:02Z
updated_at: 2026-01-22T11:08:21Z
---

## Summary
Add pagination for config history and discrepancy endpoints to avoid unbounded queries.

## Checklist
- [ ] Add limit/offset parameters to getConfigHistory
- [ ] Add pagination to getUnresolvedDiscrepancies
- [ ] Update settings UI to handle paged results
- [ ] Add tests for paging behavior