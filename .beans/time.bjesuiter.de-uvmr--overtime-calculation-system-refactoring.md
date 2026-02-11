---
# time.bjesuiter.de-uvmr
title: Overtime Calculation System Refactoring
status: completed
type: epic
priority: high
created_at: 2026-01-22T12:10:45Z
updated_at: 2026-01-22T12:41:19Z
---

Comprehensive refactoring of the overtime calculation and caching system to make it simpler, more reliable, and more efficient.

## Goals

1. Minimize Clockify API calls - cache aggressively, only refetch when user explicitly requests
2. Simplify cumulative overtime calculation with recursive approach
3. Remove locked/committed weeks concept (too complicated)
4. Proper cache invalidation cascade when values change
5. Clear separation of cache types and invalidation reasons
6. UI visibility for all refetch/recalculation operations

## Current Problems

- Cumulative overtime calculation is broken (shows -5:30 when it should be +4:30 for first week)
- Cache invalidation logic is scattered and inconsistent
- Locked weeks concept adds complexity without clear benefit
- No clear separation between 'refetch from Clockify' vs 'recalculate from cache'

## Architecture Principles

- Weekly overtime = data from Clockify (only changes on explicit refetch)
- Cumulative overtime = sum of current week overtime + previous week cumulative (derived value)
- Cache invalidation should cascade forward in time, never backward
- User actions should have predictable, visible effects
