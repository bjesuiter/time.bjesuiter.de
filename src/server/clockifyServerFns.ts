import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { userClockifyConfig } from "@/db/schema/clockify";
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
    .inputValidator((data: {
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
    }) => data)
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
                    cumulativeOvertimeStartDate:
                        data.cumulativeOvertimeStartDate || null,
                });
            }

            return { success: true };
        } catch (error) {
            console.error("Error saving Clockify config:", error);
            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to save configuration",
            };
        }
    });

/**
 * Gets Clockify configuration for the authenticated user
 */
export const getClockifyConfig = createServerFn({ method: "GET" })
    .handler(async ({ request }) => {
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
    });

/**
 * Checks if the authenticated user has Clockify setup completed
 */
export const checkClockifySetup = createServerFn({ method: "GET" })
    .handler(async ({ request }) => {
        const userId = await getAuthenticatedUserId(request);

        const config = await db.query.userClockifyConfig.findFirst({
            where: eq(userClockifyConfig.userId, userId),
        });

        return {
            hasSetup: !!config,
        };
    });

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
                    error:
                        "No API key provided and no stored configuration found",
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
                    error:
                        "No API key provided and no stored configuration found",
                };
            }

            apiKey = config.clockifyApiKey;
        }

        const result = await clockifyClient.getClients(
            apiKey,
            data.workspaceId,
        );

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
    .inputValidator((data: {
        workspaceId: string;
        clientId?: string;
        apiKey?: string;
    }) => data)
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
                    error:
                        "No API key provided and no stored configuration found",
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
