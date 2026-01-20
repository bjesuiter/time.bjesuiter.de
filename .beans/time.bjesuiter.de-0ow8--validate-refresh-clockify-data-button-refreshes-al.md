---
# time.bjesuiter.de-0ow8
title: Validate 'Refresh Clockify Data' button refreshes ALL weeks in config timeframe
status: todo
type: bug
priority: high
created_at: 2026-01-20T22:42:03Z
updated_at: 2026-01-20T22:42:03Z
---

## Description

The 'Refresh Data from Clockify' button on each Configuration Chronicle entry should refresh data for ALL weeks within that config's timeframe (validFrom to validUntil), not just the first week.

Additionally, it should properly notify/warn about locked (committed) weeks that will be affected.

## Requirements

- [ ] Verify current behavior: does invalidateCache from validFrom actually refresh all weeks?
- [ ] If not, implement logic to refresh all weeks in the config's date range
- [ ] Add warning/notification when refresh affects locked (committed) weeks
- [ ] Consider: should locked weeks be skipped or force-refreshed with user confirmation?
- [ ] Update progress indicator to show which week is being refreshed (e.g., 'Refreshing week 3 of 12...')

## Technical Notes

- Current implementation calls `invalidateCache({ fromDate: entry.validFrom })`
- This invalidates cache from that date forward, but actual re-fetch happens on dashboard visit
- May need a new server function that actively re-fetches all weeks in range
- Need to handle rate limiting across multiple API calls (exponential backoff already in place)

## Acceptance Criteria

- Clicking refresh on a config entry refreshes ALL weeks from validFrom to validUntil (or now)
- User is warned if any locked weeks will be affected
- Progress is visible during multi-week refresh operation