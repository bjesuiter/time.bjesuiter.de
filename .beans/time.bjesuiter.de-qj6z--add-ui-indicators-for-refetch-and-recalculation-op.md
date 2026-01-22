---
# time.bjesuiter.de-qj6z
title: Add UI indicators for refetch and recalculation operations
status: todo
type: task
priority: normal
created_at: 2026-01-22T12:11:23Z
updated_at: 2026-01-22T12:11:23Z
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

## Checklist
- [ ] Add loading states for weekly data fetch
- [ ] Add loading states for cumulative calculation
- [ ] Show 'last refreshed' timestamp on week view
- [ ] Update progress indicator in settings to show operation type
- [ ] Add visual distinction between fetch and recalculate operations