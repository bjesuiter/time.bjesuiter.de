---
# time.bjesuiter.de-84z5
title: Manual refresh button for Clockify settings
status: todo
type: task
priority: normal
created_at: 2026-01-19T18:52:10Z
updated_at: 2026-01-19T18:52:10Z
parent: time.bjesuiter.de-ob1k
---

Add a button in settings page to refresh timezone and weekStart from Clockify.

## Requirements
- Button in settings page under Clockify section
- Calls Clockify /v1/user endpoint
- Updates timeZone and weekStart in user_clockify_config
- Shows success/error feedback

## Context
Part of Phase 3 - Configuration Management & Versioning
This is the only remaining task for Phase 3.