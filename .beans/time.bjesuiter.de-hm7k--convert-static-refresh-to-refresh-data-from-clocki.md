---
# time.bjesuiter.de-hm7k
title: Convert static refresh to 'Refresh Data from Clockify' button on chronic timeframe
status: todo
type: feature
created_at: 2026-01-20T22:31:38Z
updated_at: 2026-01-20T22:31:38Z
---

## Description

Currently there is a static "refresh all data from January 1st this year" functionality. This should be converted to an interactive "Refresh Data from Clockify" button on the chronic timeframe view.

## Requirements

- [ ] Locate the current static refresh mechanism for the chronic timeframe
- [ ] Replace it with an interactive button labeled "Refresh Data from Clockify"
- [ ] Button should trigger a refresh of Clockify data when clicked
- [ ] Maintain the same date range logic (from January 1st of current year)
- [ ] Add appropriate loading state while refresh is in progress
- [ ] Handle errors gracefully with user feedback

## Technical Notes

- Investigate existing refresh logic in the codebase
- Ensure button follows existing UI patterns and styling