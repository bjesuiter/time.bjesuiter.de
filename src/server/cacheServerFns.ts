import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { and, eq, gt, gte, isNull, lte, or } from "drizzle-orm";
import { userClockifyConfig } from "@/db/schema/clockify";
import { configChronic } from "@/db/schema/config";
import {
  cachedDailyProjectSums,
  cachedWeeklySums,
  weeklyDiscrepancies,
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

  const existing = await db.query.cachedWeeklySums.findFirst({
    where: and(
      eq(cachedWeeklySums.userId, userId),
      eq(cachedWeeklySums.weekStart, weekStart),
    ),
  });

  const preservedStatus = existing?.status === "committed" ? "committed" : "pending";
  const preservedCommittedAt = existing?.status === "committed" ? existing.committedAt : null;

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
    status: preservedStatus,
    committedAt: preservedCommittedAt,
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
      status: preservedStatus,
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

/**
 * Refreshes a committed week and tracks any discrepancies.
 * This is the ONLY way to refresh committed weeks - ensures discrepancies are tracked.
 */
export const refreshCommittedWeek = createServerFn({ method: "POST" })
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
        error: "No cached data found for this week. Cannot refresh.",
      };
    }

    if (existing.status !== "committed") {
      return {
        success: false,
        error: "This week is not committed. Use regular refresh instead.",
      };
    }

    const oldTotalSeconds = existing.totalSeconds;
    const oldOvertimeSeconds = existing.overtimeSeconds;

    const dailyCalcResult = await calculateAndCacheDailySums({
      data: { weekStartDate: data.weekStartDate },
    });

    if (!dailyCalcResult.success) {
      return dailyCalcResult;
    }

    const config = await db.query.userClockifyConfig.findFirst({
      where: eq(userClockifyConfig.userId, userId),
    });

    if (!config) {
      return { success: false, error: "Configuration not found" };
    }

    const weekEndStr = toISODate(
      addDays(parseLocalDateInTz(data.weekStartDate, config.timeZone), 6),
    );

    const freshDailySums = await db.query.cachedDailyProjectSums.findMany({
      where: and(
        eq(cachedDailyProjectSums.userId, userId),
        gte(cachedDailyProjectSums.date, data.weekStartDate),
        lte(cachedDailyProjectSums.date, weekEndStr),
        isNull(cachedDailyProjectSums.invalidatedAt),
      ),
    });

    const newTotalSeconds = freshDailySums.reduce(
      (sum, entry) => sum + entry.seconds,
      0,
    );
    const expectedSeconds = config.regularHoursPerWeek * 3600;
    const newOvertimeSeconds = newTotalSeconds - expectedSeconds;

    const now = new Date();
    await db
      .update(cachedWeeklySums)
      .set({
        totalSeconds: newTotalSeconds,
        overtimeSeconds: newOvertimeSeconds,
        calculatedAt: now,
      })
      .where(eq(cachedWeeklySums.id, existing.id));

    let discrepancyCreated = false;
    let cumulativeOvertimeInvalidated = false;
    const overtimeChanged = newOvertimeSeconds !== oldOvertimeSeconds;

    if (
      newTotalSeconds !== oldTotalSeconds ||
      overtimeChanged
    ) {
      await db.insert(weeklyDiscrepancies).values({
        userId,
        weekStart: data.weekStartDate,
        originalTotalSeconds: oldTotalSeconds,
        newTotalSeconds: newTotalSeconds,
        differenceSeconds: newTotalSeconds - oldTotalSeconds,
        detectedAt: now,
        resolvedAt: null,
        resolution: null,
      });
      discrepancyCreated = true;

      if (overtimeChanged) {
        await db
          .update(cachedWeeklySums)
          .set({ cumulativeOvertimeSeconds: null })
          .where(
            and(
              eq(cachedWeeklySums.userId, userId),
              gt(cachedWeeklySums.weekStart, data.weekStartDate),
              isNull(cachedWeeklySums.invalidatedAt),
            ),
          );
        cumulativeOvertimeInvalidated = true;
      }
    }

    return {
      success: true,
      data: {
        weekStartDate: data.weekStartDate,
        oldTotalSeconds,
        newTotalSeconds,
        oldOvertimeSeconds,
        newOvertimeSeconds,
        discrepancyCreated,
        cumulativeOvertimeInvalidated,
        refreshedAt: now,
      },
    };
  });

/**
 * Gets all unresolved discrepancies for the current user.
 */
export const getUnresolvedDiscrepancies = createServerFn({ method: "GET" })
  .handler(async ({ request }) => {
    const userId = await getAuthenticatedUserId(request);

    const discrepancies = await db.query.weeklyDiscrepancies.findMany({
      where: and(
        eq(weeklyDiscrepancies.userId, userId),
        isNull(weeklyDiscrepancies.resolvedAt),
      ),
      orderBy: (d, { desc }) => [desc(d.detectedAt)],
    });

    return {
      success: true,
      data: {
        discrepancies: discrepancies.map((d) => ({
          id: d.id,
          weekStart: d.weekStart,
          originalTotalSeconds: d.originalTotalSeconds,
          newTotalSeconds: d.newTotalSeconds,
          differenceSeconds: d.differenceSeconds,
          detectedAt: d.detectedAt,
        })),
        hasUnresolved: discrepancies.length > 0,
      },
    };
  });

/**
 * Resolves a discrepancy by accepting or dismissing it.
 */
export const resolveDiscrepancy = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { discrepancyId: string; resolution: "accepted" | "dismissed" }) =>
      data,
  )
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);

    const discrepancy = await db.query.weeklyDiscrepancies.findFirst({
      where: and(
        eq(weeklyDiscrepancies.id, data.discrepancyId),
        eq(weeklyDiscrepancies.userId, userId),
      ),
    });

    if (!discrepancy) {
      return {
        success: false,
        error: "Discrepancy not found or does not belong to you.",
      };
    }

    if (discrepancy.resolvedAt) {
      return {
        success: true,
        data: {
          discrepancyId: data.discrepancyId,
          alreadyResolved: true,
          resolution: discrepancy.resolution,
        },
      };
    }

    const now = new Date();
    await db
      .update(weeklyDiscrepancies)
      .set({
        resolvedAt: now,
        resolution: data.resolution,
      })
      .where(eq(weeklyDiscrepancies.id, data.discrepancyId));

    return {
      success: true,
      data: {
        discrepancyId: data.discrepancyId,
        resolution: data.resolution,
        resolvedAt: now,
        alreadyResolved: false,
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

/**
 * Checks which weeks in a date range are committed.
 * Returns info to show warning before refresh.
 */
export const getCommittedWeeksInRange = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { startDate: string; endDate: string | null }) => data,
  )
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);

    const config = await db.query.userClockifyConfig.findFirst({
      where: eq(userClockifyConfig.userId, userId),
    });

    if (!config) {
      return { success: false, error: "Configuration not found" };
    }

    const endDate = data.endDate || toISODate(new Date());
    const weekStarts = getWeekStartsInRange(
      data.startDate,
      endDate,
      config.weekStart as "MONDAY" | "SUNDAY",
      config.timeZone,
    );

    // Query for committed weeks in the range
    const committedWeeks = await db.query.cachedWeeklySums.findMany({
      where: and(
        eq(cachedWeeklySums.userId, userId),
        eq(cachedWeeklySums.status, "committed"),
        isNull(cachedWeeklySums.invalidatedAt),
      ),
    });

    const committedWeekStarts = new Set(committedWeeks.map((w) => w.weekStart));
    const committedInRange = weekStarts.filter((w) =>
      committedWeekStarts.has(w),
    );

    return {
      success: true,
      data: {
        totalWeeks: weekStarts.length,
        committedWeeks: committedInRange,
        committedCount: committedInRange.length,
        hasCommittedWeeks: committedInRange.length > 0,
      },
    };
  });

export type RefreshProgressUpdate = {
  currentWeek: number;
  totalWeeks: number;
  weekStartDate: string;
  status: "pending" | "complete" | "error" | "skipped";
  error?: string;
};

/**
 * Refreshes all weeks in a config's date range.
 * Handles committed weeks based on user preference.
 */
export const refreshConfigTimeRange = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      startDate: string;
      endDate: string | null;
      includeCommittedWeeks: boolean;
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

    // Get committed weeks
    const committedWeeks = await db.query.cachedWeeklySums.findMany({
      where: and(
        eq(cachedWeeklySums.userId, userId),
        eq(cachedWeeklySums.status, "committed"),
        isNull(cachedWeeklySums.invalidatedAt),
      ),
    });
    const committedWeekStarts = new Set(committedWeeks.map((w) => w.weekStart));

    const results: {
      weekStartDate: string;
      status: "success" | "error" | "skipped";
      isCommitted: boolean;
      discrepancyCreated?: boolean;
      error?: string;
    }[] = [];

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const weekStartDate of weekStarts) {
      const isCommitted = committedWeekStarts.has(weekStartDate);

      // Skip committed weeks if user chose not to include them
      if (isCommitted && !data.includeCommittedWeeks) {
        results.push({
          weekStartDate,
          status: "skipped",
          isCommitted: true,
        });
        skippedCount++;
        continue;
      }

      try {
        if (isCommitted) {
          // Use refreshCommittedWeek to track discrepancies
          const refreshResult = await refreshCommittedWeek({
            data: { weekStartDate },
          });

          if (refreshResult.success) {
            results.push({
              weekStartDate,
              status: "success",
              isCommitted: true,
              discrepancyCreated: refreshResult.data.discrepancyCreated,
            });
            successCount++;
          } else {
            results.push({
              weekStartDate,
              status: "error",
              isCommitted: true,
              error: refreshResult.error,
            });
            errorCount++;
          }
        } else {
          // For pending weeks, recalculate daily and weekly sums
          const dailyResult = await calculateAndCacheDailySums({
            data: { weekStartDate },
          });

          if (!dailyResult.success) {
            results.push({
              weekStartDate,
              status: "error",
              isCommitted: false,
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
              isCommitted: false,
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
            isCommitted: false,
          });
          successCount++;
        }
      } catch (error) {
        results.push({
          weekStartDate,
          status: "error",
          isCommitted,
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
        skippedCount,
        results,
      },
    };
  });
