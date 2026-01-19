---
# time.bjesuiter.de-mzzt
title: Loading states & skeleton screens
status: completed
type: task
priority: normal
created_at: 2026-01-19T18:52:48Z
updated_at: 2026-01-19T19:54:48Z
parent: time.bjesuiter.de-lbhw
---

Add loading indicators throughout the app.

## Requirements
- Skeleton loaders for table data
- Spinner/loading indicator for buttons
- Progressive loading for large datasets
- Avoid layout shift during loading

## Checklist
- [x] Create TableSkeleton component
- [x] Create generic Skeleton primitive component
- [x] Add skeleton to WeeklyTimeTable loading state
- [x] Add skeleton to OvertimeSummary loading state
- [x] Review and improve button loading states

## Implementation
- Created src/components/ui/Skeleton.tsx - base skeleton primitives
- Created src/components/ui/TableSkeleton.tsx - matches WeeklyTimeTable layout
- Created src/components/ui/OvertimeSkeleton.tsx - matches overtime summaries
- Replaced spinner in dashboard with full skeleton layout
- Prevents layout shift by matching exact dimensions

## Context
Part of Phase 5 - Polish & Features
