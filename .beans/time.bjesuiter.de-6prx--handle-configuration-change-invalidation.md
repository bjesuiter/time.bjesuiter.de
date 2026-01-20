---
# time.bjesuiter.de-6prx
title: Handle configuration change invalidation
status: completed
type: task
priority: normal
created_at: 2026-01-19T18:52:27Z
updated_at: 2026-01-20T22:08:30Z
parent: time.bjesuiter.de-v3k9
---

Invalidate cache when configuration changes.

## Requirements
- When tracked projects config changes
- Invalidate all weeks from validFrom date forward
- Mark affected weeks as pending
- Trigger recalculation on next view

## Logic
1. Listen for config changes
2. Get validFrom date of new config
3. UPDATE cached_weekly_sums SET invalidatedAt = NOW() WHERE weekStart >= validFrom
4. Same for cached_daily_project_sums

## Context
Part of Phase 4 - Caching Layer & Optimization

## Checklist
- [x] Create internal `invalidateCacheFromDate` helper in `cacheServerFns.ts` (doesn't require request auth)
- [x] Export internal helper for use by configServerFns
- [x] Wire `createConfig` to call cache invalidation with `validFrom` date
- [x] Wire `updateConfig` to call cache invalidation with `validFrom` date (uses earliest affected date)
- [x] Wire `setTrackedProjects` to call cache invalidation with `validFrom` date
- [x] Run diagnostics and verify no errors
- [x] Test via build and existing tests (all 55 unit tests + 25 integration tests pass)