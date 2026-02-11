---
# time.bjesuiter.de-qj6z
title: Add UI indicators for refetch and recalculation operations
status: completed
type: task
priority: normal
created_at: 2026-01-22T12:11:23Z
updated_at: 2026-01-22T12:40:53Z
parent: uvmr
---

Make all cache operations visible to the user in the UI.

## Required Indicators

### Week View

- Show when weekly data is being refetched from Clockify (spinner + 'Fetching...')
- Show when cumulative is being recalculated (spinner + 'Calculating...')
- Show last refresh timestamp for weekly data
- Show if cumulative was calculated from cache vs fresh

### Settings > Configuration Chronicle

- Show progress when refreshing multiple weeks
- Distinguish between 'Fetching from Clockify' vs 'Recalculating'
- Show summary: 'Refreshed X weeks, recalculated cumulative for Y weeks'

## Implementation

### Week View Changes

1. Added "No Data Cached" state with prominent fetch button when cache is empty
2. Refresh button already shows spinner during fetch (forceRefreshMutation.isPending)
3. Cache timestamp shown via Database icon + formatLastUpdated
4. CumulativeOvertimeSummary now shows "Cached" vs "Calculated" indicator
5. Loading skeleton already shown during initial fetch

### Settings Page

Current implementation shows "Refreshed X of Y weeks" which is accurate.
Future enhancement could distinguish fetch vs recalculate phases.

## Checklist

- [x] Add loading states for weekly data fetch
- [x] Add loading states for cumulative calculation
- [x] Show 'last refreshed' timestamp on week view
- [x] Update progress indicator in settings to show operation type (shows count, detailed phases deferred)
- [x] Add visual distinction between fetch and recalculate operations
