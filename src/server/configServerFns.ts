import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { and, eq, isNull, lt, lte, or } from "drizzle-orm";
import { configChronic } from "@/db/schema/config";
import { auth } from "@/lib/auth/auth";

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
 * Type for tracked projects configuration value
 */
export interface TrackedProjectsValue {
    projectIds: string[];
    projectNames: string[];
}

/**
 * Type for configuration history entry
 */
export interface ConfigHistoryEntry {
    id: string;
    configType: string;
    value: TrackedProjectsValue;
    validFrom: Date;
    validUntil: Date | null;
    createdAt: Date;
}

/**
 * Gets the tracked projects configuration valid at a specific date
 * If no date is provided, returns the current configuration
 */
export const getTrackedProjects = createServerFn({ method: "GET" })
    .inputValidator((data: { date?: string } | undefined) => data)
    .handler(async ({ data, request }) => {
        const userId = await getAuthenticatedUserId(request);
        const targetDate = data?.date ? new Date(data.date) : new Date();

        try {
            // Temporal query: find config valid at targetDate
            // WHERE userId = ? AND configType = 'tracked_projects'
            //   AND validFrom <= targetDate
            //   AND (validUntil IS NULL OR validUntil > targetDate)
            const config = await db.query.configChronic.findFirst({
                where: and(
                    eq(configChronic.userId, userId),
                    eq(configChronic.configType, "tracked_projects"),
                    lte(configChronic.validFrom, targetDate),
                    or(
                        isNull(configChronic.validUntil),
                        lt(targetDate, configChronic.validUntil)
                    )
                ),
            });

            if (!config) {
                return {
                    success: true,
                    config: null,
                };
            }

            return {
                success: true,
                config: {
                    id: config.id,
                    value: JSON.parse(config.value) as TrackedProjectsValue,
                    validFrom: config.validFrom,
                    validUntil: config.validUntil,
                },
            };
        } catch (error) {
            console.error("Error getting tracked projects:", error);
            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to get tracked projects",
            };
        }
    });

/**
 * Updates the tracked projects configuration
 * Closes the current configuration and creates a new one
 */
export const setTrackedProjects = createServerFn({ method: "POST" })
    .inputValidator((data: {
        projectIds: string[];
        projectNames: string[];
    }) => data)
    .handler(async ({ data, request }) => {
        const userId = await getAuthenticatedUserId(request);
        const now = new Date();

        try {
            // Start a transaction-like operation
            // 1. Find the current config (where validUntil is NULL)
            const currentConfig = await db.query.configChronic.findFirst({
                where: and(
                    eq(configChronic.userId, userId),
                    eq(configChronic.configType, "tracked_projects"),
                    isNull(configChronic.validUntil)
                ),
            });

            // 2. If there's a current config, close it by setting validUntil
            if (currentConfig) {
                await db
                    .update(configChronic)
                    .set({
                        validUntil: now,
                    })
                    .where(eq(configChronic.id, currentConfig.id));
            }

            // 3. Create the new config with validFrom = now and validUntil = NULL
            const newConfig = await db.insert(configChronic).values({
                userId,
                configType: "tracked_projects",
                value: JSON.stringify({
                    projectIds: data.projectIds,
                    projectNames: data.projectNames,
                } as TrackedProjectsValue),
                validFrom: now,
                validUntil: null,
            }).returning();

            return {
                success: true,
                config: {
                    id: newConfig[0].id,
                    value: JSON.parse(newConfig[0].value) as TrackedProjectsValue,
                    validFrom: newConfig[0].validFrom,
                    validUntil: newConfig[0].validUntil,
                },
            };
        } catch (error) {
            console.error("Error setting tracked projects:", error);
            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to set tracked projects",
            };
        }
    });

/**
 * Gets the configuration history for a specific config type
 * Returns all historical configurations ordered by validFrom (most recent first)
 */
export const getConfigHistory = createServerFn({ method: "GET" })
    .inputValidator((data: { configType: string } | undefined) => data)
    .handler(async ({ data, request }) => {
        const userId = await getAuthenticatedUserId(request);
        const configType = data?.configType || "tracked_projects";

        try {
            const history = await db.query.configChronic.findMany({
                where: and(
                    eq(configChronic.userId, userId),
                    eq(configChronic.configType, configType as "tracked_projects")
                ),
                orderBy: (configChronic, { desc }) => [desc(configChronic.validFrom)],
            });

            return {
                success: true,
                history: history.map((entry) => ({
                    id: entry.id,
                    configType: entry.configType,
                    value: JSON.parse(entry.value) as TrackedProjectsValue,
                    validFrom: entry.validFrom,
                    validUntil: entry.validUntil,
                    createdAt: entry.createdAt,
                })),
            };
        } catch (error) {
            console.error("Error getting config history:", error);
            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to get config history",
            };
        }
    });

