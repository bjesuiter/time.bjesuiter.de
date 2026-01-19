import { expect, test, describe } from "bun:test";
import {
  toISODate,
  toISOMonth,
  getWeekStartForDate,
  getCurrentWeekStart,
  isCurrentWeek,
  formatWeekRange,
  getWeeksForMonth,
  getAdjacentMonth,
  formatMonthYear,
  parseMonthString,
  getDefaultWeekForMonth,
} from "../../src/lib/date-utils";

describe("toISODate", () => {
  test("date-utils-001: converts Date to YYYY-MM-DD format", () => {
    const date = new Date(2026, 0, 19);
    expect(toISODate(date)).toBe("2026-01-19");
  });

  test("date-utils-002: handles single digit months and days", () => {
    const date = new Date(2026, 0, 5);
    expect(toISODate(date)).toBe("2026-01-05");
  });
});

describe("toISOMonth", () => {
  test("date-utils-003: converts Date to YYYY-MM format", () => {
    const date = new Date(2026, 0, 19);
    expect(toISOMonth(date)).toBe("2026-01");
  });

  test("date-utils-004: handles December correctly", () => {
    const date = new Date(2025, 11, 15);
    expect(toISOMonth(date)).toBe("2025-12");
  });
});

describe("getWeekStartForDate", () => {
  test("date-utils-005: gets Monday as week start when weekStart is MONDAY", () => {
    const wednesday = new Date(2026, 0, 21);
    const result = getWeekStartForDate(wednesday, "MONDAY");
    expect(toISODate(result)).toBe("2026-01-19");
  });

  test("date-utils-006: gets Sunday as week start when weekStart is SUNDAY", () => {
    const wednesday = new Date(2026, 0, 21);
    const result = getWeekStartForDate(wednesday, "SUNDAY");
    expect(toISODate(result)).toBe("2026-01-18");
  });

  test("date-utils-007: handles when given date is already the week start (Monday)", () => {
    const monday = new Date(2026, 0, 19);
    const result = getWeekStartForDate(monday, "MONDAY");
    expect(toISODate(result)).toBe("2026-01-19");
  });

  test("date-utils-008: handles when given date is Sunday with MONDAY week start", () => {
    const sunday = new Date(2026, 0, 25);
    const result = getWeekStartForDate(sunday, "MONDAY");
    expect(toISODate(result)).toBe("2026-01-19");
  });
});

describe("formatWeekRange", () => {
  test("date-utils-009: formats week range correctly", () => {
    const result = formatWeekRange("2026-01-19");
    expect(result).toBe("Jan 19 - Jan 25, 2026");
  });

  test("date-utils-010: handles week spanning two months", () => {
    const result = formatWeekRange("2026-01-26");
    expect(result).toBe("Jan 26 - Feb 1, 2026");
  });

  test("date-utils-011: handles week spanning two years", () => {
    const result = formatWeekRange("2025-12-29");
    expect(result).toBe("Dec 29 - Jan 4, 2026");
  });
});

describe("getWeeksForMonth", () => {
  test("date-utils-012: returns weeks for January 2026 with MONDAY start", () => {
    const weeks = getWeeksForMonth(2026, 0, "MONDAY");
    
    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks[0].isInPreviousMonth).toBe(true);
    expect(weeks[1].isInPreviousMonth).toBe(false);
    
    const firstWeekOfMonth = weeks.find(w => !w.isInPreviousMonth);
    expect(firstWeekOfMonth).toBeDefined();
    expect(firstWeekOfMonth!.startDate).toBe("2025-12-29");
  });

  test("date-utils-013: includes previous week for context", () => {
    const weeks = getWeeksForMonth(2026, 0, "MONDAY");
    
    const prevMonthWeeks = weeks.filter(w => w.isInPreviousMonth);
    expect(prevMonthWeeks.length).toBe(1);
    expect(prevMonthWeeks[0].startDate).toBe("2025-12-22");
  });

  test("date-utils-014: each week has label and isCurrentWeek flag", () => {
    const weeks = getWeeksForMonth(2026, 0, "MONDAY");
    
    for (const week of weeks) {
      expect(week).toHaveProperty("startDate");
      expect(week).toHaveProperty("label");
      expect(week).toHaveProperty("isInPreviousMonth");
      expect(week).toHaveProperty("isCurrentWeek");
      expect(week.label).toContain("-");
    }
  });
});

describe("getAdjacentMonth", () => {
  test("date-utils-015: gets next month", () => {
    expect(getAdjacentMonth("2026-01", 1)).toBe("2026-02");
  });

  test("date-utils-016: gets previous month", () => {
    expect(getAdjacentMonth("2026-02", -1)).toBe("2026-01");
  });

  test("date-utils-017: handles year boundary going forward", () => {
    expect(getAdjacentMonth("2025-12", 1)).toBe("2026-01");
  });

  test("date-utils-018: handles year boundary going backward", () => {
    expect(getAdjacentMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("formatMonthYear", () => {
  test("date-utils-019: formats month and year correctly", () => {
    expect(formatMonthYear("2026-01")).toBe("January 2026");
  });

  test("date-utils-020: handles December", () => {
    expect(formatMonthYear("2025-12")).toBe("December 2025");
  });
});

describe("parseMonthString", () => {
  test("date-utils-021: parses month string to year and 0-indexed month", () => {
    const result = parseMonthString("2026-01");
    expect(result.year).toBe(2026);
    expect(result.month).toBe(0);
  });

  test("date-utils-022: handles December (month 11)", () => {
    const result = parseMonthString("2025-12");
    expect(result.year).toBe(2025);
    expect(result.month).toBe(11);
  });
});

describe("isCurrentWeek", () => {
  test("date-utils-023: returns true for current week", () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    
    expect(isCurrentWeek(toISODate(monday))).toBe(true);
  });

  test("date-utils-024: returns false for past week", () => {
    const pastWeek = new Date();
    pastWeek.setDate(pastWeek.getDate() - 14);
    
    expect(isCurrentWeek(toISODate(pastWeek))).toBe(false);
  });

  test("date-utils-025: returns false for future week", () => {
    const futureWeek = new Date();
    futureWeek.setDate(futureWeek.getDate() + 14);
    
    expect(isCurrentWeek(toISODate(futureWeek))).toBe(false);
  });
});

describe("getDefaultWeekForMonth", () => {
  test("date-utils-026: returns first week of month for non-current month", () => {
    const farFutureMonth = "2030-06";
    const result = getDefaultWeekForMonth(farFutureMonth, "MONDAY");
    
    const weeks = getWeeksForMonth(2030, 5, "MONDAY");
    const firstNonPrevWeek = weeks.find(w => !w.isInPreviousMonth);
    
    expect(result).toBe(firstNonPrevWeek!.startDate);
  });
});

describe("getCurrentWeekStart", () => {
  test("date-utils-027: returns current week's Monday for MONDAY start", () => {
    const result = getCurrentWeekStart("MONDAY");
    const expected = getWeekStartForDate(new Date(), "MONDAY");
    expect(result).toBe(toISODate(expected));
  });

  test("date-utils-028: returns current week's Sunday for SUNDAY start", () => {
    const result = getCurrentWeekStart("SUNDAY");
    const expected = getWeekStartForDate(new Date(), "SUNDAY");
    expect(result).toBe(toISODate(expected));
  });
});
