---
# time.bjesuiter.de-8jj7
title: Allow changing tracked projects in time period configuration
status: completed
type: feature
priority: high
created_at: 2026-01-19T19:34:03Z
updated_at: 2026-01-19T19:45:46Z
---

## Problem

When a project is renamed in Clockify (e.g., 'SMC 1.8 Weiterentwicklung' → 'Simply SMC 1.8'), the old project name and ID no longer exist. Currently, there's no way to update the tracked projects in an existing time period configuration.

## Requirements

- Add ability to edit/change the tracked projects for an existing time period
- Handle cases where previously configured projects no longer exist in Clockify
- Show clear feedback when a configured project is invalid/missing

## Checklist

- [x] Add UI to edit tracked projects on existing time periods
- [x] Validate project existence when loading time period config
- [x] Show warning/error for invalid/missing projects
- [x] Allow selecting new projects to replace invalid ones
