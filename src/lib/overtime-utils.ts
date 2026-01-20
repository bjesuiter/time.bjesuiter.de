import type { DailyBreakdown } from "@/lib/clockify/types";

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
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function getWeekDates(weekStartDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(weekStartDate);
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
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
  const expectedSecondsPerWorkday = (regularHoursPerWeek * 3600) / workingDaysPerWeek;
  
  const dailyOvertime: Record<string, DailyOvertimeInfo> = {};
  let totalWorkedSeconds = 0;
  let eligibleWorkdayCount = 0;

  const configStart = configStartDate ? new Date(configStartDate) : null;
  const today = referenceDate ? new Date(referenceDate) : new Date();
  today.setHours(23, 59, 59, 999);

  const allDates = weekStartDate 
    ? getWeekDates(weekStartDate) 
    : Object.keys(dailyBreakdown).sort();
  
  for (const dateStr of allDates) {
    const dayData = dailyBreakdown[dateStr];
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const isWeekend = isWeekendDay(date);
    const isBeforeConfigStart = configStart ? date < configStart : false;
    const isFutureDay = date > today;
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
