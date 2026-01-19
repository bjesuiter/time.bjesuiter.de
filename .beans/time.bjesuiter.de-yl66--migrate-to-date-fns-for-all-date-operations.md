---
# time.bjesuiter.de-yl66
title: Migrate to date-fns for all date operations
status: todo
type: task
priority: normal
created_at: 2026-01-19T21:30:40Z
updated_at: 2026-01-19T21:30:40Z
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

### In `src/server/clockifyServerFns.ts`:
- `parseLocalDate()` → `parseISO()` + `startOfDay()`
- Manual week iteration → `addWeeks()`
- All `setDate()`, `setHours()`, etc. → date-fns setters

### In all route/components files:
- Any `new Date(string)` → `parseISO(string)`
- Any `toISOString()` → `formatISO()` or `format()`
- Any `getDay()`, `getDate()`, `getMonth()` → date-fns getters

## Benefits
- **Correctness**: date-fns handles edge cases and timezones
- **Consistency**: Single source of truth for date operations
- **Maintainability**: Self-documenting function names
- **Bundle size**: tree-shakeable imports

## Checklist
- [ ] Install date-fns if not already present
- [ ] Update `src/lib/date-utils.ts` with date-fns
- [ ] Update `src/server/clockifyServerFns.ts` with date-fns
- [ ] Search for any other manual date operations
- [ ] Add tests for date edge cases (DST, month boundaries)
- [ ] Verify cumulative overtime calculation works correctly

## Dependencies
- Add to package.json: `date-fns`