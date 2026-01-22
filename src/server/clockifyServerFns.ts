import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { and, eq, gte, gt, isNull, lte, or } from "drizzle-orm";
import { userClockifyConfig } from "@/db/schema/clockify";
import { configChronic } from "@/db/schema/config";
import { cachedDailyProjectSums, cachedWeeklySums } from "@/db/schema/cache";
import { auth } from "@/lib/auth/auth";
import { logger } from "@/lib/logger";
import * as clockifyClient from "@/lib/clockify/client";
import type { TrackedProjectsValue } from "./configServerFns";
import { getAuthenticatedUserId as getAuthUserId } from "./authHelpers";
import type { DailyBreakdown } from "@/lib/clockify/types";
import {
  addDays,
  addWeeks,
  getDay,
  isBefore,
  isAfter,
  startOfWeek,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns";
import {
  parseLocalDateInTz,
  nowInTz,
  endOfDayInTz,
  toUTCISOString,
  toISODate,
} from "@/lib/date-utils";

function buildDailyBreakdownFromCache(
  cachedEntries: Array<typeof cachedDailyProjectSums.$inferSelect>,
  trackedProjectIds: string[],
): Record<string, DailyBreakdown> {
  const trackedProjectIdSet = new Set(trackedProjectIds);
  const dailyBreakdown: Record<string, DailyBreakdown> = {};

  for (const entry of cachedEntries) {
    if (!dailyBreakdown[entry.date]) {
      dailyBreakdown[entry.date] = {
        date: entry.date,
        trackedProjects: {},
        extraWorkProjects: {},
        totalSeconds: 0,
        extraWorkSeconds: 0,
      };
    }

    const dayData = dailyBreakdown[entry.date];
    dayData.totalSeconds += entry.seconds;

    if (trackedProjectIdSet.has(entry.projectId)) {
      dayData.trackedProjects[entry.projectId] = {
        projectId: entry.projectId,
        projectName: entry.projectName,
        seconds: entry.seconds,
      };
    } else {
      dayData.extraWorkProjects[entry.projectId] = {
        projectId: entry.projectId,
        projectName: entry.projectName,
        seconds: entry.seconds,
      };
      dayData.extraWorkSeconds += entry.seconds;
    }
  }

  return dailyBreakdown;
}

/**
 * Helper to get authenticated user ID
 * Better-auth with reactStartCookies plugin reads cookies from request headers
 */
async function getAuthenticatedUserId(request: Request): Promise<string> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return session.user.id;
}

/**
 * Validates a Clockify API key and returns user information
 */
export const validateClockifyKey = createServerFn({ method: "POST" })
  .inputValidator((data: { apiKey: string }) => data)
  .handler(async ({ data, request }) => {
    // Require authentication
    await getAuthenticatedUserId(request);

    const result = await clockifyClient.validateApiKey(data.apiKey);

    if (!result.success) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      user: result.data,
    };
  });

/**
 * Saves Clockify configuration for the authenticated user
 */
export const saveClockifyConfig = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      clockifyApiKey: string;
      clockifyWorkspaceId: string;
      clockifyUserId: string;
      timeZone: string;
      weekStart: string;
      regularHoursPerWeek: number;
      workingDaysPerWeek: number;
      selectedClientId?: string | null;
      selectedClientName?: string | null;
      cumulativeOvertimeStartDate?: string | null;
    }) => data,
  )
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);

    try {
      // Check if config already exists
      const existingConfig = await db.query.userClockifyConfig.findFirst({
        where: eq(userClockifyConfig.userId, userId),
      });

      if (existingConfig) {
        // Update existing config
        await db
          .update(userClockifyConfig)
          .set({
            clockifyApiKey: data.clockifyApiKey,
            clockifyWorkspaceId: data.clockifyWorkspaceId,
            clockifyUserId: data.clockifyUserId,
            timeZone: data.timeZone,
            weekStart: data.weekStart,
            regularHoursPerWeek: data.regularHoursPerWeek,
            workingDaysPerWeek: data.workingDaysPerWeek,
            selectedClientId: data.selectedClientId || null,
            selectedClientName: data.selectedClientName || null,
            cumulativeOvertimeStartDate:
              data.cumulativeOvertimeStartDate || null,
            updatedAt: new Date(),
          })
          .where(eq(userClockifyConfig.userId, userId));
      } else {
        // Insert new config
        await db.insert(userClockifyConfig).values({
          userId,
          clockifyApiKey: data.clockifyApiKey,
          clockifyWorkspaceId: data.clockifyWorkspaceId,
          clockifyUserId: data.clockifyUserId,
          timeZone: data.timeZone,
          weekStart: data.weekStart,
          regularHoursPerWeek: data.regularHoursPerWeek,
          workingDaysPerWeek: data.workingDaysPerWeek,
          selectedClientId: data.selectedClientId || null,
          selectedClientName: data.selectedClientName || null,
          cumulativeOvertimeStartDate: data.cumulativeOvertimeStartDate || null,
        });
      }

      return { success: true };
    } catch (error) {
      logger.error("Error saving Clockify config:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save configuration",
      };
    }
  });

/**
 * Gets Clockify configuration for the authenticated user
 */
export const getClockifyConfig = createServerFn({ method: "GET" }).handler(
  async ({ request }) => {
    const userId = await getAuthenticatedUserId(request);

    const config = await db.query.userClockifyConfig.findFirst({
      where: eq(userClockifyConfig.userId, userId),
    });

    if (!config) {
      return { success: false, error: "No configuration found" };
    }

    // Don't send the API key to the client
    const { clockifyApiKey, ...configWithoutApiKey } = config;

    return {
      success: true,
      config: configWithoutApiKey,
    };
  },
);

/**
 * Gets detailed Clockify configuration including current user info from Clockify API
 */
export const getClockifyDetails = createServerFn({ method: "GET" }).handler(
  async ({ request }) => {
    const userId = await getAuthenticatedUserId(request);

    const config = await db.query.userClockifyConfig.findFirst({
      where: eq(userClockifyConfig.userId, userId),
    });

    if (!config) {
      return { success: false, error: "No configuration found" };
    }

    // Fetch current user info from Clockify API
    const userResult = await clockifyClient.getUserInfo(config.clockifyApiKey);

    if (!userResult.success) {
      return {
        success: false,
        error: "Failed to fetch Clockify user info",
      };
    }

    // Don't send the API key to the client
    const { clockifyApiKey, ...configWithoutApiKey } = config;

    return {
      success: true,
      config: configWithoutApiKey,
      clockifyUser: userResult.data,
    };
  },
);

/**
 * Detailed setup status for the authenticated user
 */
export interface SetupStatus {
  /** Whether all required setup is complete */
  hasSetup: boolean;
  /** Individual setup steps and their completion status */
  steps: {
    /** Clockify API key is configured */
    hasApiKey: boolean;
    /** Workspace is selected */
    hasWorkspace: boolean;
    /** Client is selected for filtering */
    hasClient: boolean;
    /** At least one tracked project is configured */
    hasTrackedProjects: boolean;
  };
}

/**
 * Checks if the authenticated user has Clockify setup completed
 * Returns detailed status for each setup step
 */
export const checkClockifySetup = createServerFn({ method: "GET" }).handler(
  async ({ request }): Promise<SetupStatus> => {
    const userId = await getAuthenticatedUserId(request);

    const config = await db.query.userClockifyConfig.findFirst({
      where: eq(userClockifyConfig.userId, userId),
    });

    const hasApiKey = !!config?.clockifyApiKey;
    const hasWorkspace = !!config?.clockifyWorkspaceId;
    const hasClient = !!config?.selectedClientId;

    const trackedProjectsConfig = await db.query.configChronic.findFirst({
      where: and(
        eq(configChronic.userId, userId),
        eq(configChronic.configType, "tracked_projects"),
      ),
    });

    let hasTrackedProjects = false;
    if (trackedProjectsConfig) {
      try {
        const value = JSON.parse(trackedProjectsConfig.value) as {
          projectIds?: string[];
        };
        hasTrackedProjects =
          Array.isArray(value.projectIds) && value.projectIds.length > 0;
      } catch {
        hasTrackedProjects = false;
      }
    }

    const hasSetup = hasApiKey && hasWorkspace && hasClient && hasTrackedProjects;

    return {
      hasSetup,
      steps: {
        hasApiKey,
        hasWorkspace,
        hasClient,
        hasTrackedProjects,
      },
    };
  },
);

/**
 * Gets available workspaces from Clockify
 * Uses the stored API key if available, or accepts an API key parameter
 */
export const getClockifyWorkspaces = createServerFn({ method: "POST" })
  .inputValidator((data: { apiKey?: string }) => data)
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);

    let apiKey = data.apiKey;

    // If no API key provided, try to get from stored config
    if (!apiKey) {
      const config = await db.query.userClockifyConfig.findFirst({
        where: eq(userClockifyConfig.userId, userId),
      });

      if (!config) {
        return {
          success: false,
          error: "No API key provided and no stored configuration found",
        };
      }

      apiKey = config.clockifyApiKey;
    }

    const result = await clockifyClient.getWorkspaces(apiKey);

    if (!result.success) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      workspaces: result.data,
    };
  });

/**
 * Gets available clients from Clockify for a workspace
 */
export const getClockifyClients = createServerFn({ method: "POST" })
  .inputValidator((data: { workspaceId: string; apiKey?: string }) => data)
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);

    let apiKey = data.apiKey;

    // If no API key provided, try to get from stored config
    if (!apiKey) {
      const config = await db.query.userClockifyConfig.findFirst({
        where: eq(userClockifyConfig.userId, userId),
      });

      if (!config) {
        return {
          success: false,
          error: "No API key provided and no stored configuration found",
        };
      }

      apiKey = config.clockifyApiKey;
    }

    const result = await clockifyClient.getClients(apiKey, data.workspaceId);

    if (!result.success) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      clients: result.data,
    };
  });

/**
 * Gets available projects from Clockify for a workspace, optionally filtered by client
 */
export const getClockifyProjects = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { workspaceId: string; clientId?: string; apiKey?: string }) => data,
  )
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);

    let apiKey = data.apiKey;

    // If no API key provided, try to get from stored config
    if (!apiKey) {
      const config = await db.query.userClockifyConfig.findFirst({
        where: eq(userClockifyConfig.userId, userId),
      });

      if (!config) {
        return {
          success: false,
          error: "No API key provided and no stored configuration found",
        };
      }

      apiKey = config.clockifyApiKey;
    }

    const result = await clockifyClient.getProjects(
      apiKey,
      data.workspaceId,
      data.clientId,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      projects: result.data,
    };
  });

export const refreshClockifySettings = createServerFn({
  method: "POST",
}).handler(async ({ request }) => {
  const userId = await getAuthenticatedUserId(request);

  try {
    const config = await db.query.userClockifyConfig.findFirst({
      where: eq(userClockifyConfig.userId, userId),
    });

    if (!config) {
      return {
        success: false,
        error: "No Clockify configuration found. Please complete setup first.",
      };
    }

    const userResult = await clockifyClient.getUserInfo(config.clockifyApiKey);

    if (!userResult.success) {
      return {
        success: false,
        error: userResult.error.message || "Failed to fetch Clockify user info",
      };
    }

    const clockifyUser = userResult.data;
    const newTimeZone = clockifyUser.settings.timeZone;
    const newWeekStart = clockifyUser.settings.weekStart;

    const hasChanges =
      config.timeZone !== newTimeZone || config.weekStart !== newWeekStart;

    if (!hasChanges) {
      return {
        success: true,
        message: "Settings are already up to date",
        updated: false,
        timeZone: newTimeZone,
        weekStart: newWeekStart,
      };
    }

    await db
      .update(userClockifyConfig)
      .set({
        timeZone: newTimeZone,
        weekStart: newWeekStart,
        updatedAt: new Date(),
      })
      .where(eq(userClockifyConfig.userId, userId));

    return {
      success: true,
      message: "Settings refreshed successfully",
      updated: true,
      timeZone: newTimeZone,
      weekStart: newWeekStart,
      previousTimeZone: config.timeZone,
      previousWeekStart: config.weekStart,
    };
  } catch (error) {
    logger.error("Error refreshing Clockify settings:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to refresh Clockify settings",
    };
  }
});

export const getWeeklyTimeSummary = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { weekStartDate: string; forceRefresh?: boolean }) => data,
  )
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);

    try {
      const config = await db.query.userClockifyConfig.findFirst({
        where: eq(userClockifyConfig.userId, userId),
      });

      if (!config) {
        return {
          success: false,
          error:
            "No Clockify configuration found. Please complete setup first.",
        };
      }

      if (!config.selectedClientId) {
        return {
          success: false,
          error: "No client selected. Please select a client in settings.",
        };
      }

      const userTimeZone = config.timeZone;
      const weekStartDate = parseLocalDateInTz(
        data.weekStartDate,
        userTimeZone,
      );
      const weekEnd = endOfDayInTz(addDays(weekStartDate, 6), userTimeZone);

      const trackedProjectsConfig = await db.query.configChronic.findFirst({
        where: and(
          eq(configChronic.userId, userId),
          eq(configChronic.configType, "tracked_projects"),
          lte(configChronic.validFrom, weekEnd),
          or(
            isNull(configChronic.validUntil),
            gt(configChronic.validUntil, weekStartDate),
          ),
        ),
      });

      if (!trackedProjectsConfig) {
        return {
          success: false,
          error:
            "No tracked projects configured. Please set up tracked projects first.",
        };
      }

      const trackedProjects = JSON.parse(
        trackedProjectsConfig.value,
      ) as TrackedProjectsValue;

      if (trackedProjects.projectIds.length === 0) {
        return {
          success: false,
          error: "No projects selected for tracking.",
        };
      }

      if (!data.forceRefresh) {
        const cachedDaily = await db.query.cachedDailyProjectSums.findMany({
          where: and(
            eq(cachedDailyProjectSums.userId, userId),
            gte(cachedDailyProjectSums.date, data.weekStartDate),
            lte(
              cachedDailyProjectSums.date,
              toISODate(addDays(weekStartDate, 6)),
            ),
            isNull(cachedDailyProjectSums.invalidatedAt),
          ),
        });

        if (cachedDaily.length > 0) {
          const dailyBreakdown = buildDailyBreakdownFromCache(
            cachedDaily,
            trackedProjects.projectIds,
          );
          const oldestCacheEntry = cachedDaily.reduce((oldest, entry) =>
            entry.calculatedAt < oldest.calculatedAt ? entry : oldest,
          );

          return {
            success: true,
            data: {
              weekStartDate: data.weekStartDate,
              weekStart: config.weekStart,
              dailyBreakdown,
              trackedProjects: trackedProjects,
              regularHoursPerWeek: config.regularHoursPerWeek,
              workingDaysPerWeek: config.workingDaysPerWeek,
              clientName: config.selectedClientName,
              configStartDate: config.cumulativeOvertimeStartDate,
              cachedAt: oldestCacheEntry.calculatedAt.getTime(),
              configValidFrom: toISODate(trackedProjectsConfig.validFrom),
              configValidUntil: trackedProjectsConfig.validUntil
                ? toISODate(trackedProjectsConfig.validUntil)
                : null,
            },
          };
        }
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
        return {
          success: false,
          error: reportResult.error.message,
        };
      }

      const now = new Date();
      const dailyEntries: Array<typeof cachedDailyProjectSums.$inferInsert> =
        [];

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

      const totalSeconds = dailyEntries.reduce((sum, entry) => sum + entry.seconds, 0);
      const expectedSeconds = config.regularHoursPerWeek * 3600;
      const overtimeSeconds = totalSeconds - expectedSeconds;
      const weekEndStr = toISODate(addDays(weekStartDate, 6));

      await db
        .delete(cachedWeeklySums)
        .where(
          and(
            eq(cachedWeeklySums.userId, userId),
            eq(cachedWeeklySums.weekStart, data.weekStartDate),
          ),
        );

      await db.insert(cachedWeeklySums).values({
        userId,
        weekStart: data.weekStartDate,
        weekEnd: weekEndStr,
        clientId: config.selectedClientId,
        totalSeconds,
        regularHoursBaseline: config.regularHoursPerWeek,
        overtimeSeconds,
        cumulativeOvertimeSeconds: null,
        status: "pending",
        calculatedAt: now,
        invalidatedAt: null,
      });

      return {
        success: true,
        data: {
          weekStartDate: data.weekStartDate,
          weekStart: config.weekStart,
          dailyBreakdown: reportResult.data.dailyBreakdown,
          trackedProjects: trackedProjects,
          regularHoursPerWeek: config.regularHoursPerWeek,
          workingDaysPerWeek: config.workingDaysPerWeek,
          clientName: config.selectedClientName,
          configStartDate: config.cumulativeOvertimeStartDate,
          cachedAt: now.getTime(),
          configValidFrom: toISODate(trackedProjectsConfig.validFrom),
          configValidUntil: trackedProjectsConfig.validUntil
            ? toISODate(trackedProjectsConfig.validUntil)
            : null,
        },
      };
    } catch (error) {
      logger.error("Error fetching weekly time summary:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch weekly time summary",
      };
    }
  });

export const getCumulativeOvertime = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { currentWeekStartDate: string; forceRecalculate?: boolean }) =>
      data,
  )
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);

    try {
      const config = await db.query.userClockifyConfig.findFirst({
        where: eq(userClockifyConfig.userId, userId),
      });

      if (!config) {
        return {
          success: false,
          error: "No Clockify configuration found.",
        };
      }

      if (!config.cumulativeOvertimeStartDate) {
        return {
          success: true,
          data: {
            hasStartDate: false,
            cumulativeOvertimeSeconds: 0,
            weeksIncluded: 0,
          },
        };
      }

      if (!config.selectedClientId) {
        return {
          success: false,
          error: "No client selected.",
        };
      }

      const startDateStr = config.cumulativeOvertimeStartDate;
      const weekStartSetting = config.weekStart as "MONDAY" | "SUNDAY";
      const weekStartsOn = weekStartSetting === "MONDAY" ? 1 : 0;
      const userTimeZone = config.timeZone;
      const regularHoursPerWeek = config.regularHoursPerWeek;

      const startDate = parseLocalDateInTz(startDateStr, userTimeZone);

      const getWeekStartForDateLocal = (date: Date): Date => {
        const result = startOfWeek(date, { weekStartsOn });
        return setMilliseconds(
          setSeconds(setMinutes(setHours(result, 0), 0), 0),
          0,
        );
      };

      const firstWeekStart = getWeekStartForDateLocal(startDate);
      const currentWeekStart = getWeekStartForDateLocal(
        parseLocalDateInTz(data.currentWeekStartDate, userTimeZone),
      );

      const canUseCachedValue = !data.forceRecalculate;
      if (canUseCachedValue) {
        const currentWeekCache = await db.query.cachedWeeklySums.findFirst({
          where: and(
            eq(cachedWeeklySums.userId, userId),
            eq(cachedWeeklySums.weekStart, data.currentWeekStartDate),
            isNull(cachedWeeklySums.invalidatedAt),
          ),
        });

        if (
          currentWeekCache?.cumulativeOvertimeSeconds !== null &&
          currentWeekCache?.cumulativeOvertimeSeconds !== undefined
        ) {
          logger.debug("getCumulativeOvertime: using cached cumulative value", {
            weekStart: data.currentWeekStartDate,
            cachedValue: currentWeekCache.cumulativeOvertimeSeconds,
          });

          let weeksIncluded = 0;
          let weekIter = firstWeekStart;
          while (weekIter.getTime() <= currentWeekStart.getTime()) {
            weeksIncluded++;
            weekIter = addWeeks(weekIter, 1);
          }

          return {
            success: true,
            data: {
              hasStartDate: true,
              startDate: startDateStr,
              cumulativeOvertimeSeconds: currentWeekCache.cumulativeOvertimeSeconds,
              weeksIncluded,
              regularHoursPerWeek,
              fromCache: true,
            },
          };
        }
      }

      logger.debug("getCumulativeOvertime: calculating", {
        startDateStr,
        userTimeZone,
        startDate: startDate.toISOString(),
        currentWeekStartDate: data.currentWeekStartDate,
        firstWeekStart: firstWeekStart.toISOString(),
        currentWeekStart: currentWeekStart.toISOString(),
        forceRecalculate: data.forceRecalculate,
      });

      const weekStarts: Date[] = [];
      let weekIter = firstWeekStart;
      while (weekIter.getTime() <= currentWeekStart.getTime()) {
        weekStarts.push(weekIter);
        weekIter = addWeeks(weekIter, 1);
      }

      const cachedWeeks = await db.query.cachedWeeklySums.findMany({
        where: and(
          eq(cachedWeeklySums.userId, userId),
          gte(cachedWeeklySums.weekStart, toISODate(firstWeekStart)),
          lte(cachedWeeklySums.weekStart, data.currentWeekStartDate),
          isNull(cachedWeeklySums.invalidatedAt),
        ),
      });

      const cachedWeekMap = new Map(
        cachedWeeks.map((w) => [w.weekStart, w]),
      );

      let baseCumulativeFromCache = 0;
      let firstWeekToCalculate = 0;

      for (let i = weekStarts.length - 1; i >= 0; i--) {
        const weekStartStr = toISODate(weekStarts[i]);
        const cached = cachedWeekMap.get(weekStartStr);

        const hasValidCachedCumulative =
          cached?.cumulativeOvertimeSeconds !== null &&
          cached?.cumulativeOvertimeSeconds !== undefined;

        if (hasValidCachedCumulative) {
          baseCumulativeFromCache = cached!.cumulativeOvertimeSeconds!;
          firstWeekToCalculate = i + 1;
          logger.debug("getCumulativeOvertime: found cached cumulative starting point", {
            weekStart: weekStartStr,
            cachedCumulative: baseCumulativeFromCache,
            firstWeekToCalculate,
          });
          break;
        }
      }

      let cumulativeOvertimeSeconds = baseCumulativeFromCache;
      const expectedSecondsPerWeek = regularHoursPerWeek * 3600;
      const workingDaysPerWeek = config.workingDaysPerWeek;
      const expectedSecondsPerDay = expectedSecondsPerWeek / workingDaysPerWeek;
      const today = endOfDayInTz(nowInTz(userTimeZone), userTimeZone);

      for (let i = firstWeekToCalculate; i < weekStarts.length; i++) {
        const weekStartDateIter = weekStarts[i];
        const weekStartStr = toISODate(weekStartDateIter);
        const cached = cachedWeekMap.get(weekStartStr);

        const hasCachedWeeklyOvertime =
          cached?.overtimeSeconds !== null && cached?.overtimeSeconds !== undefined;
        if (hasCachedWeeklyOvertime) {
          cumulativeOvertimeSeconds += cached.overtimeSeconds;
        } else {
          const weekEnd = endOfDayInTz(
            addDays(weekStartDateIter, 6),
            userTimeZone,
          );

          const trackedProjectsConfig = await db.query.configChronic.findFirst({
            where: and(
              eq(configChronic.userId, userId),
              eq(configChronic.configType, "tracked_projects"),
              lte(configChronic.validFrom, weekEnd),
              or(
                isNull(configChronic.validUntil),
                gt(configChronic.validUntil, weekStartDateIter),
              ),
            ),
          });

          if (trackedProjectsConfig) {
            const trackedProjects = JSON.parse(
              trackedProjectsConfig.value,
            ) as TrackedProjectsValue;

            if (trackedProjects.projectIds.length > 0) {
              const reportResult = await clockifyClient.getWeeklyTimeReport(
                config.clockifyApiKey,
                {
                  workspaceId: config.clockifyWorkspaceId,
                  clientId: config.selectedClientId,
                  projectIds: trackedProjects.projectIds,
                  startDate: toUTCISOString(weekStartDateIter),
                  endDate: toUTCISOString(weekEnd),
                },
              );

              if (reportResult.success) {
                let weekTotalSeconds = 0;
                for (const day of Object.values(reportResult.data.dailyBreakdown)) {
                  weekTotalSeconds += day.totalSeconds;
                }

                let eligibleWorkdays = 0;
                for (let j = 0; j < 7; j++) {
                  const dayDate = addDays(weekStartDateIter, j);
                  const dayOfWeek = getDay(dayDate);
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const isBeforeConfigStart = isBefore(dayDate, startDate);
                  const isFutureDay = isAfter(dayDate, today);

                  if (!isWeekend && !isBeforeConfigStart && !isFutureDay) {
                    eligibleWorkdays++;
                    if (eligibleWorkdays >= workingDaysPerWeek) break;
                  }
                }

                const weekExpectedSeconds = eligibleWorkdays * expectedSecondsPerDay;
                const weekOvertime = weekTotalSeconds - weekExpectedSeconds;
                cumulativeOvertimeSeconds += weekOvertime;
              }
            }
          }
        }

        if (cached) {
          await db
            .update(cachedWeeklySums)
            .set({ cumulativeOvertimeSeconds })
            .where(eq(cachedWeeklySums.id, cached.id));
        }
      }

      return {
        success: true,
        data: {
          hasStartDate: true,
          startDate: startDateStr,
          cumulativeOvertimeSeconds,
          weeksIncluded: weekStarts.length,
          regularHoursPerWeek,
          fromCache: false,
        },
      };
    } catch (error) {
      logger.error("Error calculating cumulative overtime:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate cumulative overtime",
      };
    }
  });
