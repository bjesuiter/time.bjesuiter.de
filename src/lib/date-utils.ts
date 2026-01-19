/**
 * Date utilities for week and month navigation
 * All dates use YYYY-MM-DD format for consistency
 */

export interface WeekInfo {
  startDate: string; // YYYY-MM-DD
  label: string; // "Jan 13 - Jan 19, 2026"
  isInPreviousMonth: boolean;
  isCurrentWeek: boolean;
}

/**
 * Convert Date to YYYY-MM-DD string (local timezone safe)
 */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Convert Date to YYYY-MM string
 */
export function toISOMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Get the week start date for any given date
 */
export function getWeekStartForDate(
  date: Date,
  weekStart: "MONDAY" | "SUNDAY",
): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const daysToSubtract =
    weekStart === "MONDAY" ? (dayOfWeek === 0 ? 6 : dayOfWeek - 1) : dayOfWeek;
  d.setDate(d.getDate() - daysToSubtract);
  d.setHours(0, 0, 0, 0);
  return d;
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
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return today >= weekStart && today <= weekEnd;
}

/**
 * Format a week range for display
 * e.g., "Jan 13 - Jan 19, 2026"
 */
export function formatWeekRange(weekStartDate: string): string {
  const start = new Date(weekStartDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}, ${end.getFullYear()}`;
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

  // 1. Get the first day of the month
  const firstOfMonth = new Date(year, month, 1);

  // 2. Find the week that contains the first day
  const firstWeekStart = getWeekStartForDate(firstOfMonth, weekStart);

  // 3. Include previous week (always show "last week" for context)
  const prevWeekStart = new Date(firstWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekStartStr = toISODate(prevWeekStart);
  weeks.push({
    startDate: prevWeekStartStr,
    label: formatWeekRange(prevWeekStartStr),
    isInPreviousMonth: true,
    isCurrentWeek: isCurrentWeek(prevWeekStartStr),
  });

  // 4. Add all weeks that start within or overlap with this month
  const currentWeek = new Date(firstWeekStart);
  const lastOfMonth = new Date(year, month + 1, 0); // Last day of month

  while (currentWeek <= lastOfMonth) {
    const weekStartStr = toISODate(currentWeek);
    weeks.push({
      startDate: weekStartStr,
      label: formatWeekRange(weekStartStr),
      isInPreviousMonth: false,
      isCurrentWeek: isCurrentWeek(weekStartStr),
    });
    currentWeek.setDate(currentWeek.getDate() + 7);
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
  const date = new Date(year, month - 1 + direction, 1);
  return toISOMonth(date);
}

/**
 * Format month for display
 * e.g., "January 2026"
 */
export function formatMonthYear(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Parse YYYY-MM string to year and month (0-indexed)
 */
export function parseMonthString(monthStr: string): { year: number; month: number } {
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
  const currentWeekInfo = weeks.find((w) => w.isCurrentWeek && !w.isInPreviousMonth);
  if (currentWeekInfo) {
    return currentWeekInfo.startDate;
  }

  // Otherwise return the first non-previous-month week
  const firstWeek = weeks.find((w) => !w.isInPreviousMonth);
  return firstWeek?.startDate || weeks[0].startDate;
}
