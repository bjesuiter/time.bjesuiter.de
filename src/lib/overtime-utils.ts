import { format, addDays, getDay, isBefore, isAfter } from "date-fns";
import type { DailyBreakdown } from "@/lib/clockify/types";
import { parseLocalDate } from "@/lib/date-utils";

export interface DailyOvertimeInfo {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
  isBeforeConfigStart: boolean;
  workedSeconds: number;
  expectedSeconds: number;
  overtimeSeconds: number;
}

export interface WeeklyOvertimeResult {
  dailyOvertime: Record<string, DailyOvertimeInfo>;
  totalWorkedSeconds: number;
  totalExpectedSeconds: number;
  totalOvertimeSeconds: number;
  expectedSecondsPerWorkday: number;
}

function isWeekendDay(date: Date): boolean {
  const dayOfWeek = getDay(date);
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function getWeekDates(weekStartDate: string): string[] {
  const dates: string[] = [];
  const start = parseLocalDate(weekStartDate);
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    dates.push(format(date, "yyyy-MM-dd"));
  }
  return dates;
}

export function calculateWeeklyOvertime(
  dailyBreakdown: Record<string, DailyBreakdown>,
  regularHoursPerWeek: number,
  workingDaysPerWeek: number,
  configStartDate?: string | null,
  weekStartDate?: string,
  referenceDate?: Date,
): WeeklyOvertimeResult {
  const expectedSecondsPerWorkday =
    (regularHoursPerWeek * 3600) / workingDaysPerWeek;

  const dailyOvertime: Record<string, DailyOvertimeInfo> = {};
  let totalWorkedSeconds = 0;
  let eligibleWorkdayCount = 0;

  const configStart = configStartDate
    ? parseLocalDate(configStartDate)
    : null;
  const today = referenceDate ? new Date(referenceDate) : new Date();
  today.setHours(23, 59, 59, 999);

  const allDates = weekStartDate
    ? getWeekDates(weekStartDate)
    : Object.keys(dailyBreakdown).sort();

  for (const dateStr of allDates) {
    const dayData = dailyBreakdown[dateStr];
    const date = parseLocalDate(dateStr);
    const dayOfWeek = getDay(date);
    const isWeekend = isWeekendDay(date);
    const isBeforeConfigStart = configStart ? isBefore(date, configStart) : false;
    const isFutureDay = isAfter(date, today);
    const workedSeconds = dayData?.totalSeconds || 0;

    totalWorkedSeconds += workedSeconds;

    let expectedSeconds: number;
    let overtimeSeconds: number;

    if (isWeekend || isBeforeConfigStart || isFutureDay) {
      expectedSeconds = 0;
      overtimeSeconds = workedSeconds;
    } else {
      eligibleWorkdayCount++;
      if (eligibleWorkdayCount <= workingDaysPerWeek) {
        expectedSeconds = expectedSecondsPerWorkday;
        overtimeSeconds = workedSeconds - expectedSecondsPerWorkday;
      } else {
        expectedSeconds = 0;
        overtimeSeconds = workedSeconds;
      }
    }

    dailyOvertime[dateStr] = {
      date: dateStr,
      dayOfWeek,
      isWeekend,
      isBeforeConfigStart,
      workedSeconds,
      expectedSeconds,
      overtimeSeconds,
    };
  }

  const actualEligibleDays = Math.min(eligibleWorkdayCount, workingDaysPerWeek);
  const totalExpectedSeconds = actualEligibleDays * expectedSecondsPerWorkday;
  const totalOvertimeSeconds = totalWorkedSeconds - totalExpectedSeconds;

  return {
    dailyOvertime,
    totalWorkedSeconds,
    totalExpectedSeconds,
    totalOvertimeSeconds,
    expectedSecondsPerWorkday,
  };
}

export function formatOvertimeDisplay(overtimeSeconds: number): string {
  const isNegative = overtimeSeconds < 0;
  const absoluteSeconds = Math.abs(overtimeSeconds);
  const hours = Math.floor(absoluteSeconds / 3600);
  const minutes = Math.floor((absoluteSeconds % 3600) / 60);

  const timeStr = `${hours}:${minutes.toString().padStart(2, "0")}`;
  return isNegative ? `-${timeStr}` : `+${timeStr}`;
}

export function formatHoursMinutes(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}
