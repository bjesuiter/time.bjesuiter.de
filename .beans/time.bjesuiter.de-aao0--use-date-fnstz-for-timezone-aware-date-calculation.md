---
# time.bjesuiter.de-aao0
title: Use @date-fns/tz for timezone-aware date calculations
status: completed
type: feature
priority: normal
created_at: 2026-01-20T17:22:03Z
updated_at: 2026-01-20T18:22:59Z
---

Use @date-fns/tz to calculate all times and dates with the timezone specified by the Clockify config for that user. This ensures date/time operations respect the user's configured timezone from their Clockify settings.

## Implementation

### Changes Made

1. **Installed @date-fns/tz@1.4.1** - Lightweight timezone extension for date-fns v4

2. **Added timezone-aware functions to `src/lib/date-utils.ts`**:
   - `nowInTz(timeZone)` - Get current time in user's timezone
   - `parseLocalDateInTz(dateStr, timeZone)` - Parse YYYY-MM-DD string in user's timezone
   - `getWeekStartForDateInTz(date, weekStart, timeZone)` - Week start calculation in timezone
   - `getCurrentWeekStartInTz(weekStart, timeZone)` - Current week start in timezone
   - `isCurrentWeekInTz(weekStartDate, timeZone)` - Check if week is current in timezone
   - `endOfDayInTz(date, timeZone)` - End of day in timezone
   - `getWeeksForMonthInTz(year, month, weekStart, timeZone)` - Month weeks in timezone
   - `getDefaultWeekForMonthInTz(monthStr, weekStart, timeZone)` - Default week selection in timezone

3. **Updated `src/server/clockifyServerFns.ts`**:
   - `getWeeklyTimeSummary`: Uses `parseLocalDateInTz` and `endOfDayInTz` with user's Clockify timezone
   - `getCumulativeOvertime`: Uses `parseLocalDateInTz`, `nowInTz`, and `endOfDayInTz` for all date calculations

### How It Works

- The user's timezone is stored in `userClockifyConfig.timeZone` (from Clockify settings)
- Server functions now read this timezone and pass it to date utilities
- `TZDate` from @date-fns/tz ensures all calculations (week boundaries, "today" comparisons) are performed in the user's local timezone, not the server's timezone

### Testing

- 53 unit tests pass
- 25 integration tests pass
- Build succeeds

## Checklist

- [x] Install @date-fns/tz package
- [x] Add timezone-aware functions to date-utils.ts
- [x] Update getWeeklyTimeSummary to use user timezone
- [x] Update getCumulativeOvertime to use user timezone
- [x] Run tests and verify build
