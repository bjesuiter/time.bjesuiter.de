---
# time.bjesuiter.de-jjzc
title: Optimize cumulative overtime calculation
status: scrapped
type: task
priority: normal
created_at: 2026-01-20T22:30:11Z
updated_at: 2026-01-22T11:08:21Z
---

## Summary
Remove N+1 DB/API calls in cumulative overtime by batching configs and caching weekly results.

## Checklist
- [ ] Preload tracked project configs for date range
- [ ] Cache/reuse weekly report results
- [ ] Reduce per-week DB/API calls
- [ ] Validate performance with long date ranges