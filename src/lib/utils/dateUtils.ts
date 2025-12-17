/**
 * Date and week calculation utilities
 */

export type WeekStart = "MONDAY" | "SUNDAY";

/**
 * Gets the start of the week (Monday or Sunday) for a given date
 */
export function getWeekStart(date: Date, weekStart: WeekStart): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  if (weekStart === "MONDAY") {
    // Monday = 1, so we need to go back (day - 1) days
    // If day is 0 (Sunday), go back 6 days
    const daysToSubtract = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - daysToSubtract);
  } else {
    // Sunday = 0, so we need to go back 'day' days
    d.setDate(d.getDate() - day);
  }

  return d;
}

/**
 * Gets the end of the week (Sunday or Saturday) for a given date
 */
export function getWeekEnd(date: Date, weekStart: WeekStart): Date {
  const weekStartDate = getWeekStart(date, weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);
  return weekEndDate;
}

/**
 * Gets all dates in a week (7 days starting from weekStart)
 */
export function getWeekDates(
  weekStartDate: Date,
  _weekStart: WeekStart,
): Date[] {
  const dates: Date[] = [];
  const start = new Date(weekStartDate);
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }

  return dates;
}

/**
 * Gets the previous week's start date
 */
export function getPreviousWeekStart(
  currentWeekStart: Date,
  _weekStart: WeekStart,
): Date {
  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  return prevWeekStart;
}

/**
 * Gets the next week's start date
 */
export function getNextWeekStart(
  currentWeekStart: Date,
  _weekStart: WeekStart,
): Date {
  const nextWeekStart = new Date(currentWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  return nextWeekStart;
}

/**
 * Formats a date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Parses a YYYY-MM-DD string to a Date object
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString + "T00:00:00.000Z");
}

/**
 * Gets the month boundaries for a given date
 * Returns the first day of the month and the last day of the month
 */
export function getMonthBoundaries(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Gets all weeks that overlap with a given month
 * Returns array of week start dates
 */
export function getWeeksInMonth(
  monthDate: Date,
  weekStart: WeekStart,
): Date[] {
  const { start: monthStart, end: monthEnd } = getMonthBoundaries(monthDate);

  // Get the week start of the first day of the month
  const firstWeekStart = getWeekStart(monthStart, weekStart);

  // Get the week start of the last day of the month
  const lastWeekStart = getWeekStart(monthEnd, weekStart);

  const weeks: Date[] = [];
  let currentWeekStart = new Date(firstWeekStart);

  // Add all weeks from firstWeekStart to lastWeekStart
  while (currentWeekStart <= lastWeekStart) {
    weeks.push(new Date(currentWeekStart));

    // Check if this week overlaps with the month
    const weekEnd = getWeekEnd(currentWeekStart, weekStart);
    if (weekEnd >= monthStart && currentWeekStart <= monthEnd) {
      // Week overlaps with month, already added above
    }

    // Move to next week
    currentWeekStart = getNextWeekStart(currentWeekStart, weekStart);
  }

  return weeks;
}

/**
 * Checks if a date is a weekend day (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Checks if a date is a working day (not weekend)
 */
export function isWorkingDay(date: Date): boolean {
  return !isWeekend(date);
}

/**
 * Formats seconds to hours string (e.g., "5.5h" or "0.5h")
 */
export function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  if (hours === 0) return "0h";
  if (hours % 1 === 0) return `${hours}h`;
  return `${hours.toFixed(1)}h`;
}

/**
 * Formats seconds to hours:minutes string (e.g., "5h 30m" or "30m")
 */
export function formatHoursMinutes(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return minutes === 0 ? "0m" : `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Gets the day name abbreviation (Mon, Tue, etc.)
 */
export function getDayAbbreviation(date: Date): string {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return dayNames[date.getDay()];
}

/**
 * Gets the full day name (Monday, Tuesday, etc.)
 */
export function getDayName(date: Date): string {
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return dayNames[date.getDay()];
}
