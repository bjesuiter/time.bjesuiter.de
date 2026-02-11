---
# time.bjesuiter.de-f3cl
title: Fix alignment of Phase Start/End labels
status: completed
type: bug
priority: normal
created_at: 2026-01-20T21:07:32Z
updated_at: 2026-01-20T21:24:34Z
---

The 'Phase Start' and 'Phase End' labels are misaligned.

## Fix

Use a 3-column, 2-row grid layout for the navigation button groups:

- Row 1: Icons aligned horizontally
- Row 2: Labels aligned horizontally, vertically centered

## Checklist

- [x] Locate the component rendering Phase Start/End labels
- [x] Restructure left side (Phase Start, Month, Week) to 3-col, 2-row grid
- [x] Center labels vertically in row 2
- [x] Apply same grid pattern to right side (Week, Month, Phase End)
- [x] Verify alignment is fixed visually

## Resolution

Converted both left and right navigation button groups to 3-column, 2-row grids in WeekNavigationBar.tsx. Icons in row 1, labels in row 2, all vertically centered.
