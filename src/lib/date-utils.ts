/**
 * Date utilities for week and month navigation
 * All dates use YYYY-MM-DD format for consistency
 *
 * Uses date-fns and @date-fns/tz for reliable timezone handling.
 * Functions with "InTz" suffix accept a timezone parameter for user-specific calculations.
 */

import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  addMonths,
  endOfMonth,
  isWithinInterval,
  parseISO,
  getDay,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  isToday,
  isYesterday,
} from "date-fns";
import { TZDate } from "@date-fns/tz";

export interface WeekInfo {
  startDate: string; // YYYY-MM-DD
  label: string; // "Jan 13 - Jan 19, 2026"
  isInPreviousMonth: boolean;
  isCurrentWeek: boolean;
}

function getWeekStartsOn(weekStart: "MONDAY" | "SUNDAY"): 0 | 1 {
  return weekStart === "MONDAY" ? 1 : 0;
}

function startOfDay<T extends Date>(date: T): T {
  return setMilliseconds(
    setSeconds(setMinutes(setHours(date, 0), 0), 0),
    0,
  ) as T;
}

function endOfDay<T extends Date>(date: T): T {
  return setMilliseconds(
    setSeconds(setMinutes(setHours(date, 23), 59), 59),
    999,
  ) as T;
}

function getDefaultWeekFromWeeks(weeks: WeekInfo[]): string {
  const currentWeekInfo = weeks.find(
    (w) => w.isCurrentWeek && !w.isInPreviousMonth,
  );
  if (currentWeekInfo) {
    return currentWeekInfo.startDate;
  }

  const firstWeek = weeks.find((w) => !w.isInPreviousMonth);
  return firstWeek?.startDate || weeks[0].startDate;
}

/**
 * Convert Date to YYYY-MM-DD string (local timezone safe)
 * Uses date-fns format to avoid timezone issues with toISOString()
 */
export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Convert Date to YYYY-MM string
 */
export function toISOMonth(date: Date): string {
  return format(date, "yyyy-MM");
}

/**
 * Parse a YYYY-MM-DD string to a Date object at midnight local time
 * This avoids timezone issues that occur with new Date(string)
 */
export function parseLocalDate(dateStr: string): Date {
  // parseISO handles the string correctly, but we need to ensure midnight local time
  return startOfDay(parseISO(dateStr));
}

/**
 * Get the week start date for any given date
 */
export function getWeekStartForDate(
  date: Date,
  weekStart: "MONDAY" | "SUNDAY",
): Date {
  const result = startOfWeek(date, {
    weekStartsOn: getWeekStartsOn(weekStart),
  });
  // Ensure midnight local time
  return startOfDay(result);
}

/**
 * Get the current week's start date
 */
export function getCurrentWeekStart(weekStart: "MONDAY" | "SUNDAY"): string {
  return toISODate(getWeekStartForDate(new Date(), weekStart));
}

/**
 * Check if a week contains today
 */
export function isCurrentWeek(weekStartDate: string): boolean {
  const today = new Date();
  const weekStart = parseLocalDate(weekStartDate);
  const weekEnd = endOfWeek(weekStart, {
    weekStartsOn: getDay(weekStart) === 1 ? 1 : 0,
  });

  return isWithinInterval(today, { start: weekStart, end: endOfDay(weekEnd) });
}

/**
 * Format a week range for display
 * e.g., "Jan 13 - Jan 19, 2026"
 */
export function formatWeekRange(weekStartDate: string): string {
  const start = parseLocalDate(weekStartDate);
  const end = addDays(start, 6);

  const startFormatted = format(start, "MMM d");
  const endFormatted = format(end, "MMM d");
  const year = format(end, "yyyy");

  return `${startFormatted} - ${endFormatted}, ${year}`;
}

/**
 * Get all weeks that should be shown for a given month
 * Includes previous week if it's in a prior month
 */
export function getWeeksForMonth(
  year: number,
  month: number, // 0-indexed (0 = January)
  weekStart: "MONDAY" | "SUNDAY",
): WeekInfo[] {
  const weeks: WeekInfo[] = [];
  const weekStartsOn = getWeekStartsOn(weekStart);

  // 1. Get the first day of the month
  const firstOfMonth = new Date(year, month, 1);

  // 2. Find the week that contains the first day
  const firstWeekStart = startOfWeek(firstOfMonth, { weekStartsOn });

  // 3. Include previous week (always show "last week" for context)
  const prevWeekStart = addWeeks(firstWeekStart, -1);
  const prevWeekStartStr = toISODate(prevWeekStart);
  weeks.push({
    startDate: prevWeekStartStr,
    label: formatWeekRange(prevWeekStartStr),
    isInPreviousMonth: true,
    isCurrentWeek: isCurrentWeek(prevWeekStartStr),
  });

  // 4. Add all weeks that start within or overlap with this month
  let currentWeek = firstWeekStart;
  const lastOfMonth = endOfMonth(firstOfMonth);

  while (currentWeek <= lastOfMonth) {
    const weekStartStr = toISODate(currentWeek);
    weeks.push({
      startDate: weekStartStr,
      label: formatWeekRange(weekStartStr),
      isInPreviousMonth: false,
      isCurrentWeek: isCurrentWeek(weekStartStr),
    });
    currentWeek = addWeeks(currentWeek, 1);
  }

  return weeks;
}

/**
 * Get adjacent month in YYYY-MM format
 */
export function getAdjacentMonth(
  currentMonth: string,
  direction: -1 | 1,
): string {
  const [year, month] = currentMonth.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const adjacentDate = addMonths(date, direction);
  return toISOMonth(adjacentDate);
}

/**
 * Get adjacent week start date in YYYY-MM-DD format
 */
export function getAdjacentWeek(
  currentWeekStartDate: string,
  direction: -1 | 1,
): string {
  const date = parseLocalDate(currentWeekStartDate);
  const adjacentDate = addWeeks(date, direction);
  return toISODate(adjacentDate);
}

/**
 * Format month for display
 * e.g., "January 2026"
 */
export function formatMonthYear(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return format(date, "MMMM yyyy");
}

/**
 * Parse YYYY-MM string to year and month (0-indexed)
 */
export function parseMonthString(monthStr: string): {
  year: number;
  month: number;
} {
  const [year, month] = monthStr.split("-").map(Number);
  return { year, month: month - 1 };
}

/**
 * Get the best default week to select for a given month
 * - If current month: select week containing today
 * - Otherwise: select first week of the month (not the previous month week)
 */
export function getDefaultWeekForMonth(
  monthStr: string,
  weekStart: "MONDAY" | "SUNDAY",
): string {
  const { year, month } = parseMonthString(monthStr);
  const weeks = getWeeksForMonth(year, month, weekStart);
  return getDefaultWeekFromWeeks(weeks);
}

/**
 * Format a timestamp for "last updated" display
 * Uses relative day labels for recent times:
 * - "Today 14:30"
 * - "Yesterday 14:30"
 * - "Jan 20, 14:30" (for older dates)
 */
export function formatLastUpdated(timestamp: number): string {
  const date = new Date(timestamp);
  const time = format(date, "HH:mm");

  if (isToday(date)) {
    return `Today ${time}`;
  }

  if (isYesterday(date)) {
    return `Yesterday ${time}`;
  }

  return `${format(date, "MMM d")}, ${time}`;
}

// ============================================================================
// Timezone-Aware Functions (for server-side use with user's Clockify timezone)
// ============================================================================

/**
 * Get the current date/time in a specific timezone.
 * Use this instead of `new Date()` when you need the current time
 * relative to a user's configured timezone.
 */
export function nowInTz(timeZone: string): TZDate {
  return TZDate.tz(timeZone);
}

/**
 * Parse a YYYY-MM-DD string to a TZDate in the specified timezone at midnight.
 * This ensures date operations are performed in the user's timezone.
 */
export function parseLocalDateInTz(dateStr: string, timeZone: string): TZDate {
  const [year, month, day] = dateStr.split("-").map(Number);
  return TZDate.tz(timeZone, year, month - 1, day, 0, 0, 0);
}

/**
 * Get the week start date for a given date in a specific timezone.
 */
export function getWeekStartForDateInTz(
  date: Date | TZDate,
  weekStart: "MONDAY" | "SUNDAY",
  timeZone: string,
): TZDate {
  const weekStartsOn = getWeekStartsOn(weekStart);
  const tzDate =
    date instanceof TZDate ? date : TZDate.tz(timeZone, date.getTime());
  const result = startOfWeek(tzDate, { weekStartsOn });
  return startOfDay(result) as TZDate;
}

/**
 * Get the current week's start date in a specific timezone.
 */
export function getCurrentWeekStartInTz(
  weekStart: "MONDAY" | "SUNDAY",
  timeZone: string,
): string {
  const now = nowInTz(timeZone);
  return toISODate(getWeekStartForDateInTz(now, weekStart, timeZone));
}

/**
 * Get all week start dates for a date range in a specific timezone.
 * Includes the week containing startDate, then each following week until endDate.
 */
export function getWeekStartsInRangeInTz(
  startDate: string,
  endDate: string,
  weekStart: "MONDAY" | "SUNDAY",
  timeZone: string,
): string[] {
  const start = parseLocalDateInTz(startDate, timeZone);
  const end = parseLocalDateInTz(endDate, timeZone);

  if (start > end) {
    return [];
  }

  const weekStarts: string[] = [];
  let currentWeekStart = getWeekStartForDateInTz(start, weekStart, timeZone);

  while (currentWeekStart <= end) {
    weekStarts.push(toISODate(currentWeekStart));
    currentWeekStart = addWeeks(currentWeekStart, 1) as typeof currentWeekStart;
  }

  return weekStarts;
}

/**
 * Check if a week contains today in a specific timezone.
 */
export function isCurrentWeekInTz(
  weekStartDate: string,
  timeZone: string,
): boolean {
  const today = nowInTz(timeZone);
  const weekStart = parseLocalDateInTz(weekStartDate, timeZone);
  const weekStartsOn = getDay(weekStart) === 1 ? 1 : 0;
  const weekEnd = endOfWeek(weekStart, { weekStartsOn });

  return isWithinInterval(today, { start: weekStart, end: endOfDay(weekEnd) });
}

/**
 * Get the end of day in a specific timezone for a given date.
 */
export function endOfDayInTz(date: Date | TZDate, timeZone: string): TZDate {
  const tzDate =
    date instanceof TZDate ? date : TZDate.tz(timeZone, date.getTime());
  return endOfDay(tzDate) as TZDate;
}

/**
 * Get all weeks for a month with timezone awareness.
 */
export function getWeeksForMonthInTz(
  year: number,
  month: number,
  weekStart: "MONDAY" | "SUNDAY",
  timeZone: string,
): WeekInfo[] {
  const weeks: WeekInfo[] = [];
  const weekStartsOn = getWeekStartsOn(weekStart);

  const firstOfMonth = TZDate.tz(timeZone, year, month, 1, 0, 0, 0);
  const firstWeekStart = startOfWeek(firstOfMonth, { weekStartsOn });

  const prevWeekStart = addWeeks(firstWeekStart, -1);
  const prevWeekStartStr = toISODate(prevWeekStart);
  weeks.push({
    startDate: prevWeekStartStr,
    label: formatWeekRange(prevWeekStartStr),
    isInPreviousMonth: true,
    isCurrentWeek: isCurrentWeekInTz(prevWeekStartStr, timeZone),
  });

  let currentWeek = firstWeekStart;
  const lastOfMonth = endOfMonth(firstOfMonth);

  while (currentWeek <= lastOfMonth) {
    const weekStartStr = toISODate(currentWeek);
    weeks.push({
      startDate: weekStartStr,
      label: formatWeekRange(weekStartStr),
      isInPreviousMonth: false,
      isCurrentWeek: isCurrentWeekInTz(weekStartStr, timeZone),
    });
    currentWeek = addWeeks(currentWeek, 1);
  }

  return weeks;
}

/**
 * Get the best default week for a month in a specific timezone.
 */
export function getDefaultWeekForMonthInTz(
  monthStr: string,
  weekStart: "MONDAY" | "SUNDAY",
  timeZone: string,
): string {
  const { year, month } = parseMonthString(monthStr);
  const weeks = getWeeksForMonthInTz(year, month, weekStart, timeZone);
  return getDefaultWeekFromWeeks(weeks);
}

/**
 * Convert a Date or TZDate to a UTC ISO 8601 string.
 *
 * IMPORTANT: TZDate.toISOString() returns timezone offset format (e.g., "2026-01-19T00:00:00.000+01:00")
 * but many APIs (like Clockify) require UTC format (e.g., "2026-01-18T23:00:00.000Z").
 *
 * This function ensures the output is always in UTC format ending with 'Z'.
 */
export function toUTCISOString(date: Date | TZDate): string {
  return new Date(date.getTime()).toISOString();
}

/**
 * Count the number of weeks between two dates (inclusive).
 * Used for estimating calculation progress.
 */
export function countWeeksBetween(
  startDateStr: string,
  endDateStr: string,
  weekStart: "MONDAY" | "SUNDAY",
): number {
  const weekStartsOn = getWeekStartsOn(weekStart);

  const startDate = parseLocalDate(startDateStr);
  const endDate = parseLocalDate(endDateStr);

  const firstWeekStart = startOfWeek(startDate, { weekStartsOn });
  const lastWeekStart = startOfWeek(endDate, { weekStartsOn });

  let count = 0;
  let current = firstWeekStart;
  while (current <= lastWeekStart) {
    count++;
    current = addWeeks(current, 1);
  }

  return count;
}
