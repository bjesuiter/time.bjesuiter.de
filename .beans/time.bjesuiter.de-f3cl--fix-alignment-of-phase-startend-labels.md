---
# time.bjesuiter.de-f3cl
title: Fix alignment of Phase Start/End labels
status: completed
type: bug
priority: normal
created_at: 2026-01-20T21:07:32Z
updated_at: 2026-01-20T21:19:18Z
---

The 'Phase Start' and 'Phase End' labels are misaligned.

## Fix
Make the icon into one grid row and the text in the second row to fix the alignment issue.

## Checklist
- [x] Locate the component rendering Phase Start/End labels
- [x] Restructure layout: icon in first grid row, text in second row
- [x] Verify alignment is fixed visually

## Resolution
Changed `flex flex-col items-center justify-center` to `grid grid-rows-[auto_1fr] place-items-center` on both Phase Start (line 103) and Phase End (line 208) buttons in WeekNavigationBar.tsx.