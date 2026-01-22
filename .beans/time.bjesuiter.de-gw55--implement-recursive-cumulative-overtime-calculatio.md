---
# time.bjesuiter.de-gw55
title: Implement recursive cumulative overtime calculation
status: todo
type: task
priority: high
created_at: 2026-01-22T12:11:00Z
updated_at: 2026-01-22T12:11:00Z
parent: uvmr
---

Create a clean recursive function for cumulative overtime calculation.

## Algorithm
```
function calculateCumulativeOvertime(weekStartDate):
  if no previous week exists:
    return weeklyOvertime(weekStartDate)
  
  previousWeekCumulative = getCachedCumulativeOvertime(previousWeek)
  if previousWeekCumulative is null:
    previousWeekCumulative = calculateCumulativeOvertime(previousWeek)  // recurse
  
  return previousWeekCumulative + weeklyOvertime(weekStartDate)
```

## Key Points
- Must use cached cumulative overtime from previous week when available
- If previous week has no cached cumulative, recurse to calculate it
- If user force-refreshes, recalculate all previous cumulative overtimes
- Store calculated cumulative in cache for future use

## Checklist
- [ ] Create new calculateCumulativeOvertime function with recursive logic
- [ ] Ensure it uses cached values when available
- [ ] Ensure it stores calculated values in cache
- [ ] Handle edge case: first week (no previous week)
- [ ] Handle force-recalculate flag for user-triggered refresh