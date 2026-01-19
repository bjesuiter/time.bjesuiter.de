---
# time.bjesuiter.de-nnlg
title: Implement week commitment system
status: todo
type: feature
priority: high
created_at: 2026-01-19T18:52:19Z
updated_at: 2026-01-19T18:52:58Z
parent: time.bjesuiter.de-v3k9
blocking:
    - time.bjesuiter.de-50ae
---

Build the workflow for committing/uncommitting weeks.

## Requirements
- Commit action: marks week as 'committed', sets committedAt
- Uncommit action: reverts to 'pending'
- Status-based refresh logic:
  - Pending: auto-refresh on page load
  - Committed: never auto-refresh, manual only
- Per-week 'Refetch & Recalculate' button

## UI Components
- Commit/Uncommit button per week
- Visual indicator of week status
- Refetch button (always visible)

## Context
Part of Phase 4 - Caching Layer & Optimization