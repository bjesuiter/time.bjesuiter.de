---
# time.bjesuiter.de-dd1j
title: "Settings: Refresh from January 1st button"
status: completed
type: task
priority: low
created_at: 2026-01-19T18:52:24Z
updated_at: 2026-01-20T22:24:23Z
parent: time.bjesuiter.de-v3k9
---

Add button to refresh all cached data from the start of the year.

## Requirements

- Button in settings page
- Invalidates all cache from January 1st forward
- Recalculates all weeks (marks as pending)
- Progress indicator during refresh
- Confirmation dialog (expensive operation)

## Context

Part of Phase 4 - Caching Layer & Optimization

## Checklist

- [x] Backend: `invalidateCache` server function already exists in cacheServerFns.ts
- [x] Frontend: Add "Refresh from January 1st" button to settings page with:
  - ConfirmPopover dialog (warning: expensive operation)
  - Loading spinner during operation
  - Success/error feedback message
  - Use existing `invalidateCache` from `@/server/cacheServerFns`
- [x] Build verified
