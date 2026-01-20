---
# time.bjesuiter.de-4v89
title: Remove global 'Refresh All Data from January 1st' button
status: todo
type: task
created_at: 2026-01-20T22:40:19Z
updated_at: 2026-01-20T22:40:19Z
---

## Description

Now that each Configuration Chronicle entry has its own 'Refresh Data from Clockify' button, the global 'Refresh All Data from January 1st, {year}' button in the Clockify Integration section is redundant.

## Requirements

- [ ] Remove the ConfirmPopover with 'Refresh All Data from January 1st' button from settings.tsx
- [ ] Remove associated state (invalidateCacheMessage, invalidateCacheMutation) if no longer needed
- [ ] Verify no other code depends on this functionality

## Location

src/routes/settings.tsx - lines ~523-570 (Clockify Integration section)