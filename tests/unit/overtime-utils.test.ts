import { expect, test, describe } from "bun:test";
import {
  calculateWeeklyOvertime,
  formatOvertimeDisplay,
  formatHoursMinutes,
} from "../../src/lib/overtime-utils";
import type { DailyBreakdown } from "../../src/lib/clockify/types";

function createDailyBreakdown(
  date: string,
  totalSeconds: number,
): DailyBreakdown {
  return {
    date,
    trackedProjects: {},
    extraWorkProjects: {},
    totalSeconds,
    extraWorkSeconds: 0,
  };
}

describe("formatHoursMinutes", () => {
  test("overtime-001: formats seconds to HH:MM", () => {
    expect(formatHoursMinutes(3600)).toBe("1:00");
    expect(formatHoursMinutes(5400)).toBe("1:30");
    expect(formatHoursMinutes(7200)).toBe("2:00");
    expect(formatHoursMinutes(0)).toBe("0:00");
  });

  test("overtime-002: handles large values", () => {
    expect(formatHoursMinutes(36000)).toBe("10:00");
    expect(formatHoursMinutes(90000)).toBe("25:00");
  });
});

describe("formatOvertimeDisplay", () => {
  test("overtime-003: formats positive overtime with plus sign", () => {
    expect(formatOvertimeDisplay(3600)).toBe("+1:00");
    expect(formatOvertimeDisplay(5400)).toBe("+1:30");
  });

  test("overtime-004: formats negative overtime with minus sign", () => {
    expect(formatOvertimeDisplay(-3600)).toBe("-1:00");
    expect(formatOvertimeDisplay(-5400)).toBe("-1:30");
  });

  test("overtime-005: formats zero overtime", () => {
    expect(formatOvertimeDisplay(0)).toBe("+0:00");
  });
});

describe("calculateWeeklyOvertime", () => {
  const endOfWeek = new Date("2026-01-26");

  test("overtime-006: calculates overtime for normal work week", () => {
    const dailyBreakdown: Record<string, DailyBreakdown> = {
      "2026-01-19": createDailyBreakdown("2026-01-19", 5 * 3600),
      "2026-01-20": createDailyBreakdown("2026-01-20", 5 * 3600),
      "2026-01-21": createDailyBreakdown("2026-01-21", 5 * 3600),
      "2026-01-22": createDailyBreakdown("2026-01-22", 5 * 3600),
      "2026-01-23": createDailyBreakdown("2026-01-23", 5 * 3600),
      "2026-01-24": createDailyBreakdown("2026-01-24", 0),
      "2026-01-25": createDailyBreakdown("2026-01-25", 0),
    };

    const result = calculateWeeklyOvertime(dailyBreakdown, 25, 5, null, undefined, endOfWeek);

    expect(result.totalWorkedSeconds).toBe(25 * 3600);
    expect(result.totalExpectedSeconds).toBe(25 * 3600);
    expect(result.totalOvertimeSeconds).toBe(0);
  });

  test("overtime-007: calculates positive overtime for extra weekday hours", () => {
    const dailyBreakdown: Record<string, DailyBreakdown> = {
      "2026-01-19": createDailyBreakdown("2026-01-19", 6 * 3600),
      "2026-01-20": createDailyBreakdown("2026-01-20", 6 * 3600),
      "2026-01-21": createDailyBreakdown("2026-01-21", 6 * 3600),
      "2026-01-22": createDailyBreakdown("2026-01-22", 6 * 3600),
      "2026-01-23": createDailyBreakdown("2026-01-23", 6 * 3600),
      "2026-01-24": createDailyBreakdown("2026-01-24", 0),
      "2026-01-25": createDailyBreakdown("2026-01-25", 0),
    };

    const result = calculateWeeklyOvertime(dailyBreakdown, 25, 5, null, undefined, endOfWeek);

    expect(result.totalWorkedSeconds).toBe(30 * 3600);
    expect(result.totalOvertimeSeconds).toBe(5 * 3600);
  });

  test("overtime-008: weekend work counts as overtime", () => {
    const dailyBreakdown: Record<string, DailyBreakdown> = {
      "2026-01-19": createDailyBreakdown("2026-01-19", 5 * 3600),
      "2026-01-20": createDailyBreakdown("2026-01-20", 5 * 3600),
      "2026-01-21": createDailyBreakdown("2026-01-21", 5 * 3600),
      "2026-01-22": createDailyBreakdown("2026-01-22", 5 * 3600),
      "2026-01-23": createDailyBreakdown("2026-01-23", 5 * 3600),
      "2026-01-24": createDailyBreakdown("2026-01-24", 3 * 3600),
      "2026-01-25": createDailyBreakdown("2026-01-25", 0),
    };

    const result = calculateWeeklyOvertime(dailyBreakdown, 25, 5, null, undefined, endOfWeek);

    expect(result.totalWorkedSeconds).toBe(28 * 3600);
    expect(result.totalOvertimeSeconds).toBe(3 * 3600);
  });

  test("overtime-009: calculates negative overtime for underwork", () => {
    const dailyBreakdown: Record<string, DailyBreakdown> = {
      "2026-01-19": createDailyBreakdown("2026-01-19", 4 * 3600),
      "2026-01-20": createDailyBreakdown("2026-01-20", 4 * 3600),
      "2026-01-21": createDailyBreakdown("2026-01-21", 4 * 3600),
      "2026-01-22": createDailyBreakdown("2026-01-22", 4 * 3600),
      "2026-01-23": createDailyBreakdown("2026-01-23", 4 * 3600),
      "2026-01-24": createDailyBreakdown("2026-01-24", 0),
      "2026-01-25": createDailyBreakdown("2026-01-25", 0),
    };

    const result = calculateWeeklyOvertime(dailyBreakdown, 25, 5, null, undefined, endOfWeek);

    expect(result.totalWorkedSeconds).toBe(20 * 3600);
    expect(result.totalOvertimeSeconds).toBe(-5 * 3600);
  });

  test("overtime-010: handles 40h/week 5 day config", () => {
    const dailyBreakdown: Record<string, DailyBreakdown> = {
      "2026-01-19": createDailyBreakdown("2026-01-19", 8 * 3600),
      "2026-01-20": createDailyBreakdown("2026-01-20", 8 * 3600),
      "2026-01-21": createDailyBreakdown("2026-01-21", 8 * 3600),
      "2026-01-22": createDailyBreakdown("2026-01-22", 8 * 3600),
      "2026-01-23": createDailyBreakdown("2026-01-23", 8 * 3600),
      "2026-01-24": createDailyBreakdown("2026-01-24", 0),
      "2026-01-25": createDailyBreakdown("2026-01-25", 0),
    };

    const result = calculateWeeklyOvertime(dailyBreakdown, 40, 5, null, undefined, endOfWeek);

    expect(result.totalOvertimeSeconds).toBe(0);
    expect(result.expectedSecondsPerWorkday).toBe(8 * 3600);
  });

  test("overtime-011: marks weekend days correctly", () => {
    const dailyBreakdown: Record<string, DailyBreakdown> = {
      "2026-01-24": createDailyBreakdown("2026-01-24", 3600),
      "2026-01-25": createDailyBreakdown("2026-01-25", 3600),
    };

    const result = calculateWeeklyOvertime(dailyBreakdown, 25, 5, null, undefined, endOfWeek);

    expect(result.dailyOvertime["2026-01-24"].isWeekend).toBe(true);
    expect(result.dailyOvertime["2026-01-25"].isWeekend).toBe(true);
    expect(result.dailyOvertime["2026-01-24"].expectedSeconds).toBe(0);
    expect(result.dailyOvertime["2026-01-25"].expectedSeconds).toBe(0);
  });

  test("overtime-012: marks weekdays correctly", () => {
    const dailyBreakdown: Record<string, DailyBreakdown> = {
      "2026-01-19": createDailyBreakdown("2026-01-19", 5 * 3600),
      "2026-01-20": createDailyBreakdown("2026-01-20", 5 * 3600),
    };

    const result = calculateWeeklyOvertime(dailyBreakdown, 25, 5, null, undefined, endOfWeek);

    expect(result.dailyOvertime["2026-01-19"].isWeekend).toBe(false);
    expect(result.dailyOvertime["2026-01-20"].isWeekend).toBe(false);
  });

  test("overtime-013: handles empty breakdown with weekStartDate (no work = negative overtime)", () => {
    const result = calculateWeeklyOvertime({}, 25, 5, null, "2026-01-19", endOfWeek);

    expect(result.totalWorkedSeconds).toBe(0);
    expect(result.totalOvertimeSeconds).toBe(-25 * 3600);
    expect(result.totalExpectedSeconds).toBe(25 * 3600);
  });

  test("overtime-014: handles 4 working days config", () => {
    const dailyBreakdown: Record<string, DailyBreakdown> = {
      "2026-01-19": createDailyBreakdown("2026-01-19", 6.25 * 3600),
      "2026-01-20": createDailyBreakdown("2026-01-20", 6.25 * 3600),
      "2026-01-21": createDailyBreakdown("2026-01-21", 6.25 * 3600),
      "2026-01-22": createDailyBreakdown("2026-01-22", 6.25 * 3600),
      "2026-01-23": createDailyBreakdown("2026-01-23", 0),
      "2026-01-24": createDailyBreakdown("2026-01-24", 0),
      "2026-01-25": createDailyBreakdown("2026-01-25", 0),
    };

    const result = calculateWeeklyOvertime(dailyBreakdown, 25, 4, null, undefined, endOfWeek);

    expect(result.expectedSecondsPerWorkday).toBe(6.25 * 3600);
    expect(result.totalOvertimeSeconds).toBe(0);
  });

  test("overtime-015: partial week - config starts mid-week reduces expected hours", () => {
    const dailyBreakdown: Record<string, DailyBreakdown> = {
      "2025-10-01": createDailyBreakdown("2025-10-01", 8.5 * 3600),
      "2025-10-02": createDailyBreakdown("2025-10-02", 5.67 * 3600),
      "2025-10-03": createDailyBreakdown("2025-10-03", 5 * 3600),
    };

    const endOf2025Week = new Date("2025-10-05");
    const result = calculateWeeklyOvertime(
      dailyBreakdown,
      25,
      5,
      "2025-10-01",
      "2025-09-28",
      endOf2025Week,
    );

    expect(result.dailyOvertime["2025-09-28"].isBeforeConfigStart).toBe(true);
    expect(result.dailyOvertime["2025-09-29"].isBeforeConfigStart).toBe(true);
    expect(result.dailyOvertime["2025-09-30"].isBeforeConfigStart).toBe(true);
    expect(result.dailyOvertime["2025-10-01"].isBeforeConfigStart).toBe(false);
    expect(result.dailyOvertime["2025-10-02"].isBeforeConfigStart).toBe(false);
    expect(result.dailyOvertime["2025-10-03"].isBeforeConfigStart).toBe(false);

    expect(result.dailyOvertime["2025-09-28"].expectedSeconds).toBe(0);
    expect(result.dailyOvertime["2025-09-29"].expectedSeconds).toBe(0);
    expect(result.dailyOvertime["2025-09-30"].expectedSeconds).toBe(0);
    expect(result.dailyOvertime["2025-10-01"].expectedSeconds).toBe(5 * 3600);
    expect(result.dailyOvertime["2025-10-02"].expectedSeconds).toBe(5 * 3600);
    expect(result.dailyOvertime["2025-10-03"].expectedSeconds).toBe(5 * 3600);

    expect(result.totalExpectedSeconds).toBe(15 * 3600);
  });

  test("overtime-016: marks days before config start correctly", () => {
    const dailyBreakdown: Record<string, DailyBreakdown> = {};

    const endOf2025Week = new Date("2025-10-05");
    const result = calculateWeeklyOvertime(
      dailyBreakdown,
      25,
      5,
      "2025-10-01",
      "2025-09-28",
      endOf2025Week,
    );

    expect(result.dailyOvertime["2025-09-28"].isBeforeConfigStart).toBe(true);
    expect(result.dailyOvertime["2025-09-28"].isWeekend).toBe(true);
    expect(result.dailyOvertime["2025-09-29"].isBeforeConfigStart).toBe(true);
    expect(result.dailyOvertime["2025-09-30"].isBeforeConfigStart).toBe(true);
    expect(result.dailyOvertime["2025-10-04"].isBeforeConfigStart).toBe(false);
    expect(result.dailyOvertime["2025-10-04"].isWeekend).toBe(true);
  });

  test("overtime-017: full week with weekStartDate calculates correctly", () => {
    const dailyBreakdown: Record<string, DailyBreakdown> = {
      "2026-01-19": createDailyBreakdown("2026-01-19", 5 * 3600),
      "2026-01-20": createDailyBreakdown("2026-01-20", 5 * 3600),
      "2026-01-21": createDailyBreakdown("2026-01-21", 5 * 3600),
      "2026-01-22": createDailyBreakdown("2026-01-22", 5 * 3600),
      "2026-01-23": createDailyBreakdown("2026-01-23", 5 * 3600),
    };

    const result = calculateWeeklyOvertime(
      dailyBreakdown,
      25,
      5,
      null,
      "2026-01-19",
      endOfWeek,
    );

    expect(result.totalExpectedSeconds).toBe(25 * 3600);
    expect(result.totalOvertimeSeconds).toBe(0);
  });

  test("overtime-018: partial current week only counts days up to today", () => {
    const dailyBreakdown: Record<string, DailyBreakdown> = {
      "2026-01-19": createDailyBreakdown("2026-01-19", 5 * 3600),
      "2026-01-20": createDailyBreakdown("2026-01-20", 0),
    };

    const tuesday = new Date("2026-01-20");
    const result = calculateWeeklyOvertime(
      dailyBreakdown,
      25,
      5,
      null,
      "2026-01-19",
      tuesday,
    );

    expect(result.totalExpectedSeconds).toBe(10 * 3600);
    expect(result.totalWorkedSeconds).toBe(5 * 3600);
    expect(result.totalOvertimeSeconds).toBe(-5 * 3600);
  });
});
