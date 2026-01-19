---
# time.bjesuiter.de-50ae
title: Build cache calculation logic
status: todo
type: task
priority: high
created_at: 2026-01-19T18:52:16Z
updated_at: 2026-01-19T18:52:57Z
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

## Context
Part of Phase 4 - Caching Layer & Optimization