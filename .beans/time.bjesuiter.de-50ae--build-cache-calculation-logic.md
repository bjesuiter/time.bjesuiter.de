---
# time.bjesuiter.de-50ae
title: Build cache calculation logic
status: in-progress
type: task
priority: high
created_at: 2026-01-19T18:52:16Z
updated_at: 2026-01-20T20:04:33Z
parent: time.bjesuiter.de-v3k9
blocking:
    - time.bjesuiter.de-9qoq
---

Implement server functions to calculate and store cached values.

## Requirements
- Calculate daily project sums from Clockify data
- Calculate weekly totals and overtime
- Store in caching tables
- Handle recalculation on demand

## Server Functions Needed
- calculateDailySums(userId, dateRange)
- calculateWeeklySums(userId, weekStart)
- invalidateCache(userId, fromDate)

## Implementation Checklist
- [x] Create src/server/cacheServerFns.ts with cache calculation functions
- [x] Implement calculateAndCacheDailySums - fetch from Clockify and store in cache
- [x] Implement calculateAndCacheWeeklySums - aggregate daily sums and calculate overtime
- [x] Implement getCachedWeeklySummary - return cached data or calculate if missing
- [x] Implement invalidateCache - mark cache entries as invalidated from a given date
- [ ] Update getWeeklyTimeSummary to use cache when available
- [x] Run lsp_diagnostics and test (build passes)

## Context
Part of Phase 4 - Caching Layer & Optimization