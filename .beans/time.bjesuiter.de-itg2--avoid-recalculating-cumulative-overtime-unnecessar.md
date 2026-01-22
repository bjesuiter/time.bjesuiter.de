---
# time.bjesuiter.de-itg2
title: Avoid recalculating cumulative overtime unnecessarily
status: in-progress
type: bug
created_at: 2026-01-22T10:50:58Z
updated_at: 2026-01-22T10:50:58Z
---

Investigate why cumulative overtime always recalculates on week load. Only calculate when no cached value, week is unlocked, or manual refresh invalidates subsequent weeks if value changed. Do not invalidate if unchanged.

## Checklist
- [ ] Locate cumulative overtime calculation trigger and cache lookup
- [ ] Identify week lock handling and refresh invalidation behavior
- [ ] Propose or implement logic to skip recalculation when cached + locked + no refresh
