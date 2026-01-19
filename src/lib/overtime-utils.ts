import type { DailyBreakdown } from "@/lib/clockify/types";

export interface DailyOvertimeInfo {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
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
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function calculateWeeklyOvertime(
  dailyBreakdown: Record<string, DailyBreakdown>,
  regularHoursPerWeek: number,
  workingDaysPerWeek: number,
): WeeklyOvertimeResult {
  const expectedSecondsPerWorkday = (regularHoursPerWeek * 3600) / workingDaysPerWeek;
  const totalExpectedSeconds = regularHoursPerWeek * 3600;
  
  const dailyOvertime: Record<string, DailyOvertimeInfo> = {};
  let totalWorkedSeconds = 0;
  let workdayCount = 0;

  const sortedDates = Object.keys(dailyBreakdown).sort();
  
  for (const dateStr of sortedDates) {
    const dayData = dailyBreakdown[dateStr];
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const isWeekend = isWeekendDay(date);
    const workedSeconds = dayData.totalSeconds;
    
    totalWorkedSeconds += workedSeconds;

    let expectedSeconds: number;
    let overtimeSeconds: number;

    if (isWeekend) {
      expectedSeconds = 0;
      overtimeSeconds = workedSeconds;
    } else {
      workdayCount++;
      if (workdayCount <= workingDaysPerWeek) {
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
      workedSeconds,
      expectedSeconds,
      overtimeSeconds,
    };
  }

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
