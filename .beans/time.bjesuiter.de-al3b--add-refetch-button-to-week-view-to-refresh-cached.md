---
# time.bjesuiter.de-al3b
title: Add refetch button to week view to refresh cached data
status: completed
type: feature
priority: normal
created_at: 2026-01-19T20:45:29Z
updated_at: 2026-01-19T20:47:53Z
---

## Problem

There's no way to manually refresh/refetch the data for a specific week once it's been cached. If data changes in Clockify, users need a way to update the cached view.

## Requirements

- Add a refresh/refetch button on the week view
- Button should fetch fresh data from Clockify for that specific week
- Update the cache with the new data after fetching

## Checklist

- [x] Add refetch button UI to week view
- [x] Implement refetch logic that bypasses cache
- [x] Update cache with freshly fetched data
- [x] Show loading state during refetch

## Implementation Notes

- Added RefreshCw icon button next to Calendar in Weekly Time Summary header
- Button triggers refetch of both weeklyQuery and cumulativeOvertimeQuery
- Shows spinning animation during refetch
- Disabled state while refetching to prevent double-clicks
- 44px min tap target for mobile accessibility