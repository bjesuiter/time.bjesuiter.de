---
# time.bjesuiter.de-m4tx
title: Show timestamp for last fetched from Clockify
status: completed
type: feature
priority: normal
created_at: 2026-01-20T17:05:27Z
updated_at: 2026-01-20T17:11:03Z
---

## Summary

Added timestamp showing when data was last fetched from Clockify.

## Implementation

- Shows time (HH:MM format) next to the refresh button on desktop screens
- Also included in the refresh button's tooltip for mobile users
- Uses TanStack Query's `dataUpdatedAt` property for accuracy

## User Experience

- Desktop: Visible clock icon with timestamp (e.g., '14:30') 
- Mobile: Timestamp visible in refresh button tooltip
- Updates automatically when data is refetched