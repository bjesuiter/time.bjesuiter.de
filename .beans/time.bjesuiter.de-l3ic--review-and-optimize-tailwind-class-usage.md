---
# time.bjesuiter.de-l3ic
title: Review and optimize Tailwind class usage
status: scrapped
type: task
priority: normal
created_at: 2026-01-21T23:42:45Z
updated_at: 2026-01-22T11:08:21Z
---

Some components use dynamic className concatenation which could be optimized with better patterns.

## Issues Found
- UserMenu.tsx uses conditional class strings
- Skeleton.tsx has multiple dynamic className concatenations
- CumulativeOvertimeSummary.tsx has conditional className logic

## Checklist
- [ ] Review all dynamic className concatenations
- [ ] Consider using clsx or cn helper for class merging
- [ ] Extract common className patterns to utility functions
- [ ] Use conditional rendering for clearer className logic where appropriate
- [ ] Ensure Tailwind CSS classes are used consistently