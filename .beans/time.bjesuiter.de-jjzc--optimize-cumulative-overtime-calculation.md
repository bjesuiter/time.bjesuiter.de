---
# time.bjesuiter.de-jjzc
title: Optimize cumulative overtime calculation
status: todo
type: task
created_at: 2026-01-20T22:30:11Z
updated_at: 2026-01-20T22:30:11Z
---

## Summary
Remove N+1 DB/API calls in cumulative overtime by batching configs and caching weekly results.

## Checklist
- [ ] Preload tracked project configs for date range
- [ ] Cache/reuse weekly report results
- [ ] Reduce per-week DB/API calls
- [ ] Validate performance with long date ranges