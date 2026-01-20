---
# time.bjesuiter.de-hm7k
title: Convert static refresh to 'Refresh Data from Clockify' button on chronic timeframe
status: completed
type: feature
priority: normal
created_at: 2026-01-20T22:31:38Z
updated_at: 2026-01-20T22:38:51Z
---

## Description

Add a "Refresh Data from Clockify" button per Configuration Chronicle entry that refreshes cached data from that entry's start date.

## Requirements

- [x] Add "Refresh Data from Clockify" button per Configuration Chronicle entry
- [x] Button triggers cache invalidation from entry's validFrom date
- [x] Add loading state (spinning icon) while refresh is in progress
- [x] Show success/error message after operation completes
- [x] Add exponential backoff retry logic for API throttling (429 errors)
- [x] Confirmation popover warns user this is an expensive operation

## Implementation

- Added `refreshConfigEntryMutation` in settings.tsx for per-entry cache invalidation
- Added RefreshCw button with ConfirmPopover to each Configuration Chronicle entry
- Tracks `refreshingConfigId` state to show loading spinner on correct entry
- Shows `refreshConfigMessage` success/error feedback per entry
- Updated `api-instance.ts` and `reports-api-instance.ts` with exponential backoff:
  - 5 retry attempts
  - Base delay 1s, max 30s
  - Jitter added to prevent thundering herd
