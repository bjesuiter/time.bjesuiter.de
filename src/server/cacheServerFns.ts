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
import { addDays } from "date-fns";
import {
  parseLocalDateInTz,
  endOfDayInTz,
  toUTCISOString,
  toISODate,
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
    status: "pending",
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
      status: "pending" as const,
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
            status: cached.status,
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
    const now = new Date();

    await db
      .update(cachedDailyProjectSums)
      .set({ invalidatedAt: now })
      .where(
        and(
          eq(cachedDailyProjectSums.userId, userId),
          gte(cachedDailyProjectSums.date, data.fromDate),
          isNull(cachedDailyProjectSums.invalidatedAt),
        ),
      );

    await db
      .update(cachedWeeklySums)
      .set({ invalidatedAt: now })
      .where(
        and(
          eq(cachedWeeklySums.userId, userId),
          gte(cachedWeeklySums.weekStart, data.fromDate),
          isNull(cachedWeeklySums.invalidatedAt),
        ),
      );

    return {
      success: true,
      data: {
        fromDate: data.fromDate,
        invalidatedAt: now,
      },
    };
  });

/**
 * Commits a week, preventing auto-refresh on page load.
 * Committed weeks can only be refreshed manually.
 */
export const commitWeek = createServerFn({ method: "POST" })
  .inputValidator((data: { weekStartDate: string }) => data)
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);
    const now = new Date();

    const existing = await db.query.cachedWeeklySums.findFirst({
      where: and(
        eq(cachedWeeklySums.userId, userId),
        eq(cachedWeeklySums.weekStart, data.weekStartDate),
        isNull(cachedWeeklySums.invalidatedAt),
      ),
    });

    if (!existing) {
      return {
        success: false,
        error: "No cached data found for this week. Refresh the data first.",
      };
    }

    if (existing.status === "committed") {
      return {
        success: true,
        data: {
          weekStartDate: data.weekStartDate,
          status: "committed" as const,
          committedAt: existing.committedAt,
          alreadyCommitted: true,
        },
      };
    }

    await db
      .update(cachedWeeklySums)
      .set({
        status: "committed",
        committedAt: now,
      })
      .where(eq(cachedWeeklySums.id, existing.id));

    return {
      success: true,
      data: {
        weekStartDate: data.weekStartDate,
        status: "committed" as const,
        committedAt: now,
        alreadyCommitted: false,
      },
    };
  });

/**
 * Uncommits a week, reverting it to pending status.
 * This allows auto-refresh on page load again.
 */
export const uncommitWeek = createServerFn({ method: "POST" })
  .inputValidator((data: { weekStartDate: string }) => data)
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);

    const existing = await db.query.cachedWeeklySums.findFirst({
      where: and(
        eq(cachedWeeklySums.userId, userId),
        eq(cachedWeeklySums.weekStart, data.weekStartDate),
        isNull(cachedWeeklySums.invalidatedAt),
      ),
    });

    if (!existing) {
      return {
        success: false,
        error: "No cached data found for this week.",
      };
    }

    if (existing.status === "pending") {
      return {
        success: true,
        data: {
          weekStartDate: data.weekStartDate,
          status: "pending" as const,
          alreadyPending: true,
        },
      };
    }

    await db
      .update(cachedWeeklySums)
      .set({
        status: "pending",
        committedAt: null,
      })
      .where(eq(cachedWeeklySums.id, existing.id));

    return {
      success: true,
      data: {
        weekStartDate: data.weekStartDate,
        status: "pending" as const,
        alreadyPending: false,
      },
    };
  });

/**
 * Gets the commit status for a specific week.
 */
export const getWeekCommitStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { weekStartDate: string }) => data)
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);

    const cached = await db.query.cachedWeeklySums.findFirst({
      where: and(
        eq(cachedWeeklySums.userId, userId),
        eq(cachedWeeklySums.weekStart, data.weekStartDate),
        isNull(cachedWeeklySums.invalidatedAt),
      ),
    });

    if (!cached) {
      return {
        success: true,
        data: {
          weekStartDate: data.weekStartDate,
          status: "pending" as const,
          hasCachedData: false,
          committedAt: null,
        },
      };
    }

    return {
      success: true,
      data: {
        weekStartDate: data.weekStartDate,
        status: cached.status as "pending" | "committed",
        hasCachedData: true,
        committedAt: cached.committedAt,
      },
    };
  });
