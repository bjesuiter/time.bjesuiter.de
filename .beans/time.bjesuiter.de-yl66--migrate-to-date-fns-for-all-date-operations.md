---
# time.bjesuiter.de-yl66
title: Migrate to date-fns for all date operations
status: completed
type: task
priority: normal
created_at: 2026-01-19T21:30:40Z
updated_at: 2026-01-20T17:20:55Z
---

## Problem

The codebase has multiple timezone bugs caused by inconsistent date handling:

- `toISODate()` uses `toISOString()` which converts to UTC
- Manual date calculations with `getDay()`, `setDate()`, `getHours()` are error-prone
- Date parsing with `new Date(string)` has inconsistent timezone behavior

## Solution

Migrate ALL date operations to use [date-fns](https://date-fns.org/) library which handles timezones correctly.

## Scope

Replace all manual date operations with date-fns equivalents:

### In `src/lib/date-utils.ts`:

- `toISODate()` → `format(date, 'yyyy-MM-dd')`
- `toISOMonth()` → `format(date, 'yyyy-MM')`
- `getWeekStartForDate()` → `startOfWeek(date, { weekStartsOn: 1 })`
- `getCurrentWeekStart()` → `startOfWeek(new Date(), { weekStartsOn: 1 })`
- `isCurrentWeek()` → `isWithinInterval()`
- `formatWeekRange()` → `format()` with proper options
- `getWeeksForMonth()` → `startOfMonth()`, `endOfMonth()`, `eachWeekOfInterval()`
- `parseMonthString()` → keep manual (simple string parsing)
- Added `parseLocalDate()` helper for consistent date string parsing

### In `src/server/clockifyServerFns.ts`:

- `parseLocalDate()` → imported from date-utils
- Manual week iteration → `addWeeks()`
- All `setDate()`, `setHours()`, etc. → date-fns setters
- `getDay()` → date-fns `getDay()`
- Date comparisons → `isBefore()`, `isAfter()`

### In `src/lib/overtime-utils.ts`:

- `new Date()` → `parseLocalDate()` from date-utils
- `toISOString().split('T')[0]` → `format(date, 'yyyy-MM-dd')`
- Date comparisons → `isBefore()`, `isAfter()`

### In `src/lib/clockify/client.ts`:

- `extractDateFromId()` → `parseISO()` + `format()` + `isValid()`

## Benefits

- **Correctness**: date-fns handles edge cases and timezones
- **Consistency**: Single source of truth for date operations
- **Maintainability**: Self-documenting function names
- **Bundle size**: tree-shakeable imports

## Checklist

- [x] Install date-fns if not already present
- [x] Update `src/lib/date-utils.ts` with date-fns
- [x] Update `src/lib/overtime-utils.ts` with date-fns
- [x] Update `src/server/clockifyServerFns.ts` with date-fns
- [x] Update `src/lib/clockify/client.ts` with date-fns
- [x] Run unit tests (53 tests pass)
- [x] Verify build works

## Dependencies

- Added to package.json: `date-fns@4.1.0`
