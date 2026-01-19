import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { userClockifyConfig } from "@/db/schema/clockify";
import { configChronic } from "@/db/schema/config";
import { auth } from "@/lib/auth/auth";
import * as clockifyClient from "@/lib/clockify/client";
import type { TrackedProjectsValue } from "./configServerFns";

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
      console.error("Error saving Clockify config:", error);
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
 * Checks if the authenticated user has Clockify setup completed
 */
export const checkClockifySetup = createServerFn({ method: "GET" }).handler(
  async ({ request }) => {
    const userId = await getAuthenticatedUserId(request);

    const config = await db.query.userClockifyConfig.findFirst({
      where: eq(userClockifyConfig.userId, userId),
    });

    return {
      hasSetup: !!config,
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

export const refreshClockifySettings = createServerFn({ method: "POST" }).handler(
  async ({ request }) => {
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
      console.error("Error refreshing Clockify settings:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to refresh Clockify settings",
      };
    }
  },
);

export const getWeeklyTimeSummary = createServerFn({ method: "POST" })
  .inputValidator((data: { weekStartDate: string }) => data)
  .handler(async ({ data, request }) => {
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

      if (!config.selectedClientId) {
        return {
          success: false,
          error: "No client selected. Please select a client in settings.",
        };
      }

      const weekStart = new Date(data.weekStartDate);
      const trackedProjectsConfig = await db.query.configChronic.findFirst({
        where: and(
          eq(configChronic.userId, userId),
          eq(configChronic.configType, "tracked_projects"),
          lte(configChronic.validFrom, weekStart),
          or(
            isNull(configChronic.validUntil),
            gt(configChronic.validUntil, weekStart),
          ),
        ),
      });

      if (!trackedProjectsConfig) {
        return {
          success: false,
          error: "No tracked projects configured. Please set up tracked projects first.",
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

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const startDate = new Date(weekStart);
      startDate.setHours(0, 0, 0, 0);

      const reportResult = await clockifyClient.getWeeklyTimeReport(
        config.clockifyApiKey,
        {
          workspaceId: config.clockifyWorkspaceId,
          clientId: config.selectedClientId,
          projectIds: trackedProjects.projectIds,
          startDate: startDate.toISOString(),
          endDate: weekEnd.toISOString(),
        },
      );

      if (!reportResult.success) {
        return {
          success: false,
          error: reportResult.error.message,
        };
      }

      return {
        success: true,
        data: {
          weekStartDate: data.weekStartDate,
          weekStart: config.weekStart,
          dailyBreakdown: reportResult.data.dailyBreakdown,
          trackedProjects: trackedProjects,
          regularHoursPerWeek: config.regularHoursPerWeek,
          workingDaysPerWeek: config.workingDaysPerWeek,
        },
      };
    } catch (error) {
      console.error("Error fetching weekly time summary:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch weekly time summary",
      };
    }
  });
