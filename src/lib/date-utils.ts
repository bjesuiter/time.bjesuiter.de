/**
 * Date utilities for week and month navigation
 * All dates use YYYY-MM-DD format for consistency
 *
 * Uses date-fns for reliable timezone handling
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
} from "date-fns";

export interface WeekInfo {
  startDate: string; // YYYY-MM-DD
  label: string; // "Jan 13 - Jan 19, 2026"
  isInPreviousMonth: boolean;
  isCurrentWeek: boolean;
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
  const parsed = parseISO(dateStr);
  return setMilliseconds(setSeconds(setMinutes(setHours(parsed, 0), 0), 0), 0);
}

/**
 * Get the week start date for any given date
 */
export function getWeekStartForDate(
  date: Date,
  weekStart: "MONDAY" | "SUNDAY",
): Date {
  const weekStartsOn = weekStart === "MONDAY" ? 1 : 0;
  const result = startOfWeek(date, { weekStartsOn });
  // Ensure midnight local time
  return setMilliseconds(setSeconds(setMinutes(setHours(result, 0), 0), 0), 0);
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
  // Set weekEnd to end of day
  const weekEndEOD = setMilliseconds(
    setSeconds(setMinutes(setHours(weekEnd, 23), 59), 59),
    999,
  );

  return isWithinInterval(today, { start: weekStart, end: weekEndEOD });
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
  const weekStartsOn = weekStart === "MONDAY" ? 1 : 0;

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

  // Find current week if it exists in this month
  const currentWeekInfo = weeks.find(
    (w) => w.isCurrentWeek && !w.isInPreviousMonth,
  );
  if (currentWeekInfo) {
    return currentWeekInfo.startDate;
  }

  // Otherwise return the first non-previous-month week
  const firstWeek = weeks.find((w) => !w.isInPreviousMonth);
  return firstWeek?.startDate || weeks[0].startDate;
}
