import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { userClockifyConfig } from "@/db/schema/clockify";
import { configChronic } from "@/db/schema/config";
import {
  cachedDailyProjectSums,
  cachedWeeklySums,
} from "@/db/schema/cache";
import { auth } from "@/lib/auth/auth";
import * as clockifyClient from "@/lib/clockify/client";
import type { TrackedProjectsValue } from "./configServerFns";
import { addDays, addWeeks } from "date-fns";
import {
  parseLocalDateInTz,
  endOfDayInTz,
  toUTCISOString,
  toISODate,
  getWeekStartForDateInTz,
} from "@/lib/date-utils";

async function getAuthenticatedUserId(request: Request): Promise<string> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return session.user.id;
}

export const calculateAndCacheDailySums = createServerFn({ method: "POST" })
  .inputValidator((data: { weekStartDate: string }) => data)
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);

    const config = await db.query.userClockifyConfig.findFirst({
      where: eq(userClockifyConfig.userId, userId),
    });

    if (!config || !config.selectedClientId) {
      return { success: false, error: "Configuration not complete" };
    }

    const userTimeZone = config.timeZone;
    const weekStartDate = parseLocalDateInTz(data.weekStartDate, userTimeZone);
    const weekEnd = endOfDayInTz(addDays(weekStartDate, 6), userTimeZone);

    const trackedProjectsConfig = await db.query.configChronic.findFirst({
      where: and(
        eq(configChronic.userId, userId),
        eq(configChronic.configType, "tracked_projects"),
        lte(configChronic.validFrom, weekEnd),
        or(
          isNull(configChronic.validUntil),
          gte(configChronic.validUntil, weekStartDate),
        ),
      ),
    });

    if (!trackedProjectsConfig) {
      return { success: false, error: "No tracked projects configured" };
    }

    const trackedProjects = JSON.parse(
      trackedProjectsConfig.value,
    ) as TrackedProjectsValue;

    if (trackedProjects.projectIds.length === 0) {
      return { success: false, error: "No projects selected for tracking" };
    }

    const reportResult = await clockifyClient.getWeeklyTimeReport(
      config.clockifyApiKey,
      {
        workspaceId: config.clockifyWorkspaceId,
        clientId: config.selectedClientId,
        projectIds: trackedProjects.projectIds,
        startDate: toUTCISOString(weekStartDate),
        endDate: toUTCISOString(weekEnd),
      },
    );

    if (!reportResult.success) {
      return { success: false, error: reportResult.error.message };
    }

    const now = new Date();
    const dailyEntries: Array<typeof cachedDailyProjectSums.$inferInsert> = [];

    for (const [dateStr, dayData] of Object.entries(
      reportResult.data.dailyBreakdown,
    )) {
      for (const [projectId, projectData] of Object.entries(
        dayData.trackedProjects,
      )) {
        dailyEntries.push({
          userId,
          date: dateStr,
          projectId,
          projectName: projectData.projectName,
          clientId: config.selectedClientId,
          seconds: projectData.seconds,
          calculatedAt: now,
          invalidatedAt: null,
        });
      }

      for (const [projectId, projectData] of Object.entries(
        dayData.extraWorkProjects,
      )) {
        dailyEntries.push({
          userId,
          date: dateStr,
          projectId,
          projectName: projectData.projectName,
          clientId: config.selectedClientId,
          seconds: projectData.seconds,
          calculatedAt: now,
          invalidatedAt: null,
        });
      }
    }

    await db
      .delete(cachedDailyProjectSums)
      .where(
        and(
          eq(cachedDailyProjectSums.userId, userId),
          gte(cachedDailyProjectSums.date, data.weekStartDate),
          lte(
            cachedDailyProjectSums.date,
            toISODate(addDays(weekStartDate, 6)),
          ),
        ),
      );

    if (dailyEntries.length > 0) {
      await db.insert(cachedDailyProjectSums).values(dailyEntries);
    }

    return {
      success: true,
      data: {
        entriesCached: dailyEntries.length,
        weekStartDate: data.weekStartDate,
      },
    };
  });

export const calculateAndCacheWeeklySums = createServerFn({ method: "POST" })
  .inputValidator((data: { weekStartDate: string }) => data)
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);

    const config = await db.query.userClockifyConfig.findFirst({
      where: eq(userClockifyConfig.userId, userId),
    });

    if (!config || !config.selectedClientId) {
      return { success: false, error: "Configuration not complete" };
    }

    const userTimeZone = config.timeZone;
    const weekStartDate = parseLocalDateInTz(data.weekStartDate, userTimeZone);
    const weekEndDate = addDays(weekStartDate, 6);
    const weekEndStr = toISODate(weekEndDate);

    const dailySums = await db.query.cachedDailyProjectSums.findMany({
      where: and(
        eq(cachedDailyProjectSums.userId, userId),
        gte(cachedDailyProjectSums.date, data.weekStartDate),
        lte(cachedDailyProjectSums.date, weekEndStr),
        isNull(cachedDailyProjectSums.invalidatedAt),
      ),
    });

    if (dailySums.length === 0) {
      const calcResult = await calculateAndCacheDailySums({
        data: { weekStartDate: data.weekStartDate },
      });
      if (!calcResult.success) {
        return calcResult;
      }

      const freshDailySums = await db.query.cachedDailyProjectSums.findMany({
        where: and(
          eq(cachedDailyProjectSums.userId, userId),
          gte(cachedDailyProjectSums.date, data.weekStartDate),
          lte(cachedDailyProjectSums.date, weekEndStr),
          isNull(cachedDailyProjectSums.invalidatedAt),
        ),
      });

      return calculateWeeklySumsFromDaily(
        userId,
        data.weekStartDate,
        weekEndStr,
        config.selectedClientId,
        config.regularHoursPerWeek,
        freshDailySums,
      );
    }

    return calculateWeeklySumsFromDaily(
      userId,
      data.weekStartDate,
      weekEndStr,
      config.selectedClientId,
      config.regularHoursPerWeek,
      dailySums,
    );
  });

async function calculateWeeklySumsFromDaily(
  userId: string,
  weekStart: string,
  weekEnd: string,
  clientId: string,
  regularHoursBaseline: number,
  dailySums: Array<typeof cachedDailyProjectSums.$inferSelect>,
) {
  const totalSeconds = dailySums.reduce((sum, entry) => sum + entry.seconds, 0);
  const expectedSeconds = regularHoursBaseline * 3600;
  const overtimeSeconds = totalSeconds - expectedSeconds;

  await db
    .delete(cachedWeeklySums)
    .where(
      and(
        eq(cachedWeeklySums.userId, userId),
        eq(cachedWeeklySums.weekStart, weekStart),
      ),
    );

  const now = new Date();
  await db.insert(cachedWeeklySums).values({
    userId,
    weekStart,
    weekEnd,
    clientId,
    totalSeconds,
    regularHoursBaseline,
    overtimeSeconds,
    cumulativeOvertimeSeconds: null,
    calculatedAt: now,
    invalidatedAt: null,
  });

  return {
    success: true,
    data: {
      weekStart,
      weekEnd,
      totalSeconds,
      regularHoursBaseline,
      overtimeSeconds,
    },
  };
}

export const getCachedWeeklySummary = createServerFn({ method: "POST" })
  .inputValidator((data: { weekStartDate: string; forceRefresh?: boolean }) => data)
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);

    if (!data.forceRefresh) {
      const cached = await db.query.cachedWeeklySums.findFirst({
        where: and(
          eq(cachedWeeklySums.userId, userId),
          eq(cachedWeeklySums.weekStart, data.weekStartDate),
          isNull(cachedWeeklySums.invalidatedAt),
        ),
      });

      if (cached) {
        return {
          success: true,
          data: {
            weekStart: cached.weekStart,
            weekEnd: cached.weekEnd,
            totalSeconds: cached.totalSeconds,
            regularHoursBaseline: cached.regularHoursBaseline,
            overtimeSeconds: cached.overtimeSeconds,
            cumulativeOvertimeSeconds: cached.cumulativeOvertimeSeconds,
            calculatedAt: cached.calculatedAt,
            fromCache: true,
          },
        };
      }
    }

    const calcResult = await calculateAndCacheWeeklySums({
      data: { weekStartDate: data.weekStartDate },
    });

    if (!calcResult.success) {
      return calcResult;
    }

    return {
      success: true,
      data: {
        ...calcResult.data,
        cumulativeOvertimeSeconds: null,
        calculatedAt: new Date(),
        fromCache: false,
      },
    };
  });

export const invalidateCache = createServerFn({ method: "POST" })
  .inputValidator((data: { fromDate: string }) => data)
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);
    const { invalidateCacheFromDate } = await import("./cacheHelpers");
    const result = await invalidateCacheFromDate(userId, data.fromDate);

    return {
      success: true,
      data: {
        fromDate: data.fromDate,
        invalidatedAt: result.invalidatedAt,
      },
    };
  });



/**
 * Gets all week start dates within a date range.
 * Used to determine which weeks need to be refreshed for a config entry.
 */
function getWeekStartsInRange(
  startDate: string,
  endDate: string,
  weekStart: "MONDAY" | "SUNDAY",
  timeZone: string,
): string[] {
  const start = parseLocalDateInTz(startDate, timeZone);
  const end = parseLocalDateInTz(endDate, timeZone);

  // Get the first week start that contains or comes after startDate
  let currentWeekStart = getWeekStartForDateInTz(start, weekStart, timeZone);

  // If currentWeekStart is before startDate, move to next week
  if (currentWeekStart < start) {
    currentWeekStart = addWeeks(currentWeekStart, 1) as typeof currentWeekStart;
  }

  const weekStarts: string[] = [];

  // Include the week containing startDate even if week starts before startDate
  const startingWeek = getWeekStartForDateInTz(start, weekStart, timeZone);
  if (toISODate(startingWeek) !== toISODate(currentWeekStart)) {
    weekStarts.push(toISODate(startingWeek));
  }

  while (currentWeekStart <= end) {
    weekStarts.push(toISODate(currentWeekStart));
    currentWeekStart = addWeeks(currentWeekStart, 1) as typeof currentWeekStart;
  }

  return weekStarts;
}

export type RefreshProgressUpdate = {
  currentWeek: number;
  totalWeeks: number;
  weekStartDate: string;
  status: "pending" | "complete" | "error";
  error?: string;
};

/**
 * Refreshes all weeks in a config's date range.
 * Recalculates daily and weekly sums from Clockify API.
 */
export const refreshConfigTimeRange = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      startDate: string;
      endDate: string | null;
    }) => data,
  )
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);

    const config = await db.query.userClockifyConfig.findFirst({
      where: eq(userClockifyConfig.userId, userId),
    });

    if (!config || !config.selectedClientId) {
      return { success: false, error: "Configuration not complete" };
    }

    const endDate = data.endDate || toISODate(new Date());
    const weekStarts = getWeekStartsInRange(
      data.startDate,
      endDate,
      config.weekStart as "MONDAY" | "SUNDAY",
      config.timeZone,
    );

    const results: {
      weekStartDate: string;
      status: "success" | "error";
      error?: string;
    }[] = [];

    let successCount = 0;
    let errorCount = 0;

    for (const weekStartDate of weekStarts) {
      try {
        // Recalculate daily and weekly sums
        const dailyResult = await calculateAndCacheDailySums({
          data: { weekStartDate },
        });

        if (!dailyResult.success) {
          results.push({
            weekStartDate,
            status: "error",
            error: dailyResult.error,
          });
          errorCount++;
          continue;
        }

        const weeklyResult = await calculateAndCacheWeeklySums({
          data: { weekStartDate },
        });

        if (!weeklyResult.success) {
          results.push({
            weekStartDate,
            status: "error",
            error:
              "error" in weeklyResult
                ? weeklyResult.error
                : "Weekly calculation failed",
          });
          errorCount++;
          continue;
        }

        results.push({
          weekStartDate,
          status: "success",
        });
        successCount++;
      } catch (error) {
        results.push({
          weekStartDate,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        errorCount++;
      }
    }

    return {
      success: true,
      data: {
        totalWeeks: weekStarts.length,
        successCount,
        errorCount,
        results,
      },
    };
  });
