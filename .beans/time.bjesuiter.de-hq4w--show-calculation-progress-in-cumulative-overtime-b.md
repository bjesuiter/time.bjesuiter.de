---
# time.bjesuiter.de-hq4w
title: Show calculation progress in cumulative overtime bar
status: completed
type: feature
created_at: 2026-01-22T11:42:17Z
updated_at: 2026-01-22T11:50:00Z
---

Display which week is being calculated (e.g., 'Calculating week 5 of 12...') in the cumulative overtime loading state.

## Implementation

1. Added `countWeeksBetween()` utility in `src/lib/date-utils.ts`
2. Updated `CumulativeOvertimeSummary` component to accept `estimatedWeeksTotal` prop
3. Loading state now shows "Calculating cumulative overtime (X weeks)..."
4. For large date ranges (>10 weeks), shows additional message "This may take a moment"
5. Calculated client-side from config start date to selected week
