---
# time.bjesuiter.de-gu4u
title: End button cycles through config timeframe boundaries
status: completed
type: feature
priority: normal
created_at: 2026-01-20T21:35:32Z
updated_at: 2026-01-20T21:40:13Z
---

The End button should jump across config timeframe borders:
- If already on end week of current timeframe, jump to next timeframe's end
- Fall back to 'now' (today's week) if that's later than all config ends
- Same logic for Start button (jump to previous timeframe's start)

## Implementation
1. Create server function to get all config timeframe boundaries
2. Pass timeframe boundaries to WeekNavigationBar
3. Update End/Start button handlers to cycle through boundaries

## Checklist
- [x] Create getConfigTimelines server function
- [x] Update WeekNavigationBar props to accept timeline boundaries
- [x] Update handleJumpToConfigEnd to cycle through ends
- [x] Update handleJumpToConfigStart to cycle through starts
- [ ] Test cycling behavior