---
# time.bjesuiter.de-gw55
title: Implement recursive cumulative overtime calculation
status: completed
type: task
priority: high
created_at: 2026-01-22T12:11:00Z
updated_at: 2026-01-22T12:32:34Z
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

- [x] Create new calculateCumulativeOvertime function with recursive logic
- [x] Ensure it uses cached values when available
- [x] Ensure it stores calculated values in cache
- [x] Handle edge case: first week (no previous week)
- [x] Handle force-recalculate flag for user-triggered refresh
