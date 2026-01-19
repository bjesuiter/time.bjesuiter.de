---
# time.bjesuiter.de-84z5
title: Manual refresh button for Clockify settings
status: completed
type: task
priority: normal
created_at: 2026-01-19T18:52:10Z
updated_at: 2026-01-19T19:19:52Z
parent: time.bjesuiter.de-ob1k
---

Add a button in settings page to refresh timezone and weekStart from Clockify.

## Requirements
- [x] Button in settings page under Clockify section
- [x] Calls Clockify /v1/user endpoint
- [x] Updates timeZone and weekStart in user_clockify_config
- [x] Shows success/error feedback

## Implementation
- Added `refreshClockifySettings` server function in `src/server/clockifyServerFns.ts`
- Added refresh button with RefreshCw icon under Clockify Account section in `src/routes/settings.tsx`
- Shows spinning animation during refresh
- Displays success/error message for 5 seconds after completion

## Context
Part of Phase 3 - Configuration Management & Versioning
This is the only remaining task for Phase 3.