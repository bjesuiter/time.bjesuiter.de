---
# time.bjesuiter.de-immf
title: Recursively calculate missing cumulative overtime for previous weeks
status: completed
type: task
created_at: 2026-01-22T11:13:39Z
updated_at: 2026-01-22T11:25:00Z
---

When calculating cumulative overtime for a week, if previous weeks are missing their cumulative overtime, recursively calculate and cache them. Stop at tracking start or at a committed week with cached cumulative overtime.

## Implementation

Modified `getCumulativeOvertime` in `src/server/clockifyServerFns.ts`:

- Now stores cumulative overtime for EACH intermediate week as we iterate through the range
- Previously only stored cumulative overtime for the final requested week
- This ensures that when calculating cumulative overtime for week N, weeks 1 through N-1 also get their cumulative overtime cached
- Future requests for any of those intermediate weeks will return cached values immediately
