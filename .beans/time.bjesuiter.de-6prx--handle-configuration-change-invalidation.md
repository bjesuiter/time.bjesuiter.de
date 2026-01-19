---
# time.bjesuiter.de-6prx
title: Handle configuration change invalidation
status: todo
type: task
priority: normal
created_at: 2026-01-19T18:52:27Z
updated_at: 2026-01-19T18:52:27Z
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