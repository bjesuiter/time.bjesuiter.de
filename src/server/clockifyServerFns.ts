import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { eq, and, lte, gt, or, isNull } from "drizzle-orm";
import { userClockifyConfig } from "@/db/schema/clockify";
import { configChronic } from "@/db/schema/config";
import { auth } from "@/lib/auth/auth";
import * as clockifyClient from "@/lib/clockify/client";

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

/**
 * Gets weekly time report for a specific week
 * Fetches data from Clockify API and returns daily breakdown
 */
export const getWeeklyTimeReport = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      weekStart: string; // ISO date string for Monday (or Sunday) of the week
    }) => data,
  )
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request);

    try {
      // Get user's Clockify config
      const config = await db.query.userClockifyConfig.findFirst({
        where: eq(userClockifyConfig.userId, userId),
      });

      if (!config) {
        return {
          success: false,
          error: "Clockify configuration not found",
        };
      }

      // Get tracked projects config for the week start date
      const targetDate = new Date(data.weekStart);
      const trackedProjectsConfig = await db.query.configChronic.findFirst({
        where: and(
          eq(configChronic.userId, userId),
          eq(configChronic.configType, "tracked_projects"),
          lte(configChronic.validFrom, targetDate),
          or(
            isNull(configChronic.validUntil),
            gt(configChronic.validUntil, targetDate),
          ),
        ),
      });

      if (!trackedProjectsConfig) {
        return {
          success: false,
          error: "No tracked projects configuration found for this week",
        };
      }

      if (!config.selectedClientId) {
        return {
          success: false,
          error: "No client filter configured. Please configure a client in settings.",
        };
      }

      const trackedProjects = JSON.parse(
        trackedProjectsConfig.value,
      ) as { projectIds: string[]; projectNames: string[] };

      if (trackedProjects.projectIds.length === 0) {
        return {
          success: false,
          error: "No tracked projects configured for this week",
        };
      }

      // Calculate week end date (6 days after week start)
      const weekStartDate = new Date(data.weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);

      // Format dates for Clockify API (ISO 8601 with time)
      const startDateISO = `${weekStartDate.toISOString().split("T")[0]}T00:00:00.000Z`;
      const endDateISO = `${weekEndDate.toISOString().split("T")[0]}T23:59:59.999Z`;

      // Call Clockify API to get weekly time report
      const reportResult = await clockifyClient.getWeeklyTimeReport(
        config.clockifyApiKey,
        {
          workspaceId: config.clockifyWorkspaceId,
          clientId: config.selectedClientId,
          projectIds: trackedProjects.projectIds,
          startDate: startDateISO,
          endDate: endDateISO,
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
        data: reportResult.data,
        weekStart: data.weekStart,
        weekEnd: weekEndDate.toISOString().split("T")[0],
        trackedProjects: trackedProjects,
        regularHoursPerWeek: config.regularHoursPerWeek,
        workingDaysPerWeek: config.workingDaysPerWeek,
        clientName: config.selectedClientName || "All Clients",
      };
    } catch (error) {
      console.error("Error getting weekly time report:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get weekly time report",
      };
    }
  });
