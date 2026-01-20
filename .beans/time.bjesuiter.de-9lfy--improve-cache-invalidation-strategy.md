---
# time.bjesuiter.de-9lfy
title: Improve cache invalidation strategy
status: todo
type: task
created_at: 2026-01-20T22:31:02Z
updated_at: 2026-01-20T22:31:02Z
---

## Summary
Align server cache invalidation with client query invalidation and tuning of stale/gc times.

## Checklist
- [ ] Add central query invalidation helpers
- [ ] Invalidate related queries after config/cache mutations
- [ ] Add gcTime and per-query staleTime overrides
- [ ] Verify dashboard consistency after changes