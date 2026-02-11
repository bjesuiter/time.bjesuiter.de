---
# time.bjesuiter.de-mho8
title: "Improve wording: prefix projects with client name"
status: completed
type: task
priority: normal
created_at: 2026-01-19T19:16:19Z
updated_at: 2026-01-19T19:48:48Z
---

## Problem

Add the client name in front of project names in the weekly time table for better clarity.

## Requirements

- Prefix tracked projects with client name: 'secunet - SMC 1.9'
- Prefix Extra Work with client name: 'secunet - Extra Work'
- Get client name from user_clockify_config.selectedClientName

## Implementation

- [x] Added clientName to getWeeklyTimeSummary response
- [x] Added clientName prop to WeeklyTimeTable component
- [x] Created formatProjectName helper to prefix names with client
- [x] Applied prefix to all project names and Extra Work label

## Context

Part of Phase 2 - Clockify Integration & Basic Display
