import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { and, eq, gt, gte, isNull, lt, lte, not, or } from "drizzle-orm";
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
 * Gets the current config (auto-determined by current date)
 * Internal helper function
 */
async function getCurrentConfigInternal(userId: string) {
    const now = new Date();
    return await db.query.configChronic.findFirst({
        where: and(
            eq(configChronic.userId, userId),
            eq(configChronic.configType, "tracked_projects"),
            lte(configChronic.validFrom, now),
            or(
                isNull(configChronic.validUntil),
                gt(configChronic.validUntil, now)
            )
        ),
    });
}

/**
 * Gets the current config (auto-determined by current date)
 * Exported server function
 */
export const getCurrentConfig = createServerFn({ method: "GET" })
    .inputValidator((data: undefined) => data)
    .handler(async ({ data, request }) => {
        const userId = await getAuthenticatedUserId(request);

        try {
            const config = await getCurrentConfigInternal(userId);

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
            console.error("Error getting current config:", error);
            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to get current configuration",
            };
        }
    });

/**
 * Gets all configs ordered by validFrom (ascending)
 */
async function getAllConfigsOrdered(userId: string) {
    return await db.query.configChronic.findMany({
        where: and(
            eq(configChronic.userId, userId),
            eq(configChronic.configType, "tracked_projects")
        ),
        orderBy: (configChronic, { asc }) => [asc(configChronic.validFrom)],
    });
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
 * Creates a new tracked projects configuration
 * Handles date validation and automatically closes overlapping configs
 */
export const createConfig = createServerFn({ method: "POST" })
    .inputValidator((data: {
        projectIds: string[];
        projectNames: string[];
        validFrom: string; // ISO date string, required
    }) => data)
    .handler(async ({ data, request }) => {
        const userId = await getAuthenticatedUserId(request);
        const validFromDate = new Date(data.validFrom);

        try {
            // Get all configs ordered by validFrom
            const allConfigs = await getAllConfigsOrdered(userId);
            const now = new Date();

            // Find the current config (auto-determined by date)
            const currentConfig = await getCurrentConfigInternal(userId);

            // Validation: Check if new startDate is before current config's startDate
            if (currentConfig) {
                const currentValidFrom = new Date(currentConfig.validFrom);
                if (validFromDate < currentValidFrom) {
                    return {
                        success: false,
                        error: `Start date cannot be before the current config's start date (${currentValidFrom.toISOString()})`,
                    };
                }
            }

            // Handle closing existing configs
            if (currentConfig) {
                // If start date is after "now", schedule for later by setting end date of current config
                // Otherwise, set current config's end date to new config's start date
                await db
                    .update(configChronic)
                    .set({
                        validUntil: validFromDate,
                    })
                    .where(eq(configChronic.id, currentConfig.id));
            }

            // Close any configs that overlap with the new config's start date
            // This handles cases where we're inserting in the past or future
            for (const config of allConfigs) {
                const configValidFrom = new Date(config.validFrom);
                const configValidUntil = config.validUntil ? new Date(config.validUntil) : null;

                // Skip if this is the current config (already handled above)
                if (currentConfig && config.id === currentConfig.id) {
                    continue;
                }

                // If config overlaps with new start date, close it
                const overlaps = 
                    (configValidUntil === null || configValidUntil > validFromDate) &&
                    configValidFrom < validFromDate;

                if (overlaps) {
                    await db
                        .update(configChronic)
                        .set({
                            validUntil: validFromDate,
                        })
                        .where(eq(configChronic.id, config.id));
                }
            }

            // Create the new config
            const newConfig = await db.insert(configChronic).values({
                userId,
                configType: "tracked_projects",
                value: JSON.stringify({
                    projectIds: data.projectIds,
                    projectNames: data.projectNames,
                } as TrackedProjectsValue),
                validFrom: validFromDate,
                validUntil: null, // New config is current until superseded
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
            console.error("Error creating config:", error);
            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to create configuration",
            };
        }
    });

/**
 * Updates an existing configuration's start and/or end dates
 * Validates constraints: startDate can't be before previous config, endDate can't exceed next config
 */
export const updateConfig = createServerFn({ method: "POST" })
    .inputValidator((data: {
        configId: string;
        validFrom?: string; // ISO date string
        validUntil?: string | null; // ISO date string or null
    }) => data)
    .handler(async ({ data, request }) => {
        const userId = await getAuthenticatedUserId(request);

        try {
            // Verify the config belongs to the user
            const config = await db.query.configChronic.findFirst({
                where: and(
                    eq(configChronic.id, data.configId),
                    eq(configChronic.userId, userId)
                ),
            });

            if (!config) {
                return {
                    success: false,
                    error: "Configuration entry not found or unauthorized",
                };
            }

            // Get all configs ordered by validFrom
            const allConfigs = await getAllConfigsOrdered(userId);
            const configIndex = allConfigs.findIndex(c => c.id === data.configId);

            if (configIndex === -1) {
                return {
                    success: false,
                    error: "Configuration entry not found",
                };
            }

            const currentValidFrom = new Date(config.validFrom);
            const currentValidUntil = config.validUntil ? new Date(config.validUntil) : null;

            // Determine new values
            const newValidFrom = data.validFrom ? new Date(data.validFrom) : currentValidFrom;
            const newValidUntil = data.validUntil === null ? null : (data.validUntil ? new Date(data.validUntil) : currentValidUntil);

            // Validation: StartDate can never be before startDate of previous config
            if (configIndex > 0) {
                const previousConfig = allConfigs[configIndex - 1];
                const previousValidFrom = new Date(previousConfig.validFrom);
                if (newValidFrom < previousValidFrom) {
                    return {
                        success: false,
                        error: `Start date cannot be before the previous config's start date (${previousValidFrom.toISOString()})`,
                    };
                }
            }

            // Validation: EndDate can never exceed endDate of next config
            if (configIndex < allConfigs.length - 1) {
                const nextConfig = allConfigs[configIndex + 1];
                const nextValidUntil = nextConfig.validUntil ? new Date(nextConfig.validUntil) : null;
                if (newValidUntil !== null && nextValidUntil !== null && newValidUntil > nextValidUntil) {
                    return {
                        success: false,
                        error: `End date cannot exceed the next config's end date (${nextValidUntil.toISOString()})`,
                    };
                }
                // Also check that newValidFrom doesn't exceed next config's validFrom
                const nextValidFrom = new Date(nextConfig.validFrom);
                if (newValidFrom >= nextValidFrom) {
                    return {
                        success: false,
                        error: `Start date cannot be on or after the next config's start date (${nextValidFrom.toISOString()})`,
                    };
                }
            }

            // Validation: validFrom must be before validUntil (if validUntil is set)
            if (newValidUntil !== null && newValidFrom >= newValidUntil) {
                return {
                    success: false,
                    error: "Start date must be before end date",
                };
            }

            // Update the config
            const updated = await db
                .update(configChronic)
                .set({
                    validFrom: newValidFrom,
                    validUntil: newValidUntil,
                })
                .where(eq(configChronic.id, data.configId))
                .returning();

            return {
                success: true,
                config: {
                    id: updated[0].id,
                    value: JSON.parse(updated[0].value) as TrackedProjectsValue,
                    validFrom: updated[0].validFrom,
                    validUntil: updated[0].validUntil,
                },
            };
        } catch (error) {
            console.error("Error updating config:", error);
            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to update configuration",
            };
        }
    });

/**
 * Legacy function for backward compatibility
 * @deprecated Use createConfig instead
 */
export const setTrackedProjects = createServerFn({ method: "POST" })
    .inputValidator((data: {
        projectIds: string[];
        projectNames: string[];
        validFrom?: string; // ISO date string, defaults to now
    }) => data)
    .handler(async ({ data, request }) => {
        const validFrom = data.validFrom || new Date().toISOString();
        const userId = await getAuthenticatedUserId(request);
        const validFromDate = new Date(validFrom);

        try {
            // Get all configs ordered by validFrom
            const allConfigs = await getAllConfigsOrdered(userId);
            const now = new Date();

            // Find the current config (auto-determined by date)
            const currentConfig = await getCurrentConfigInternal(userId);

            // Validation: Check if new startDate is before current config's startDate
            if (currentConfig) {
                const currentValidFrom = new Date(currentConfig.validFrom);
                if (validFromDate < currentValidFrom) {
                    return {
                        success: false,
                        error: `Start date cannot be before the current config's start date (${currentValidFrom.toISOString()})`,
                    };
                }
            }

            // Handle closing existing configs
            if (currentConfig) {
                // If start date is after "now", schedule for later by setting end date of current config
                // Otherwise, set current config's end date to new config's start date
                await db
                    .update(configChronic)
                    .set({
                        validUntil: validFromDate,
                    })
                    .where(eq(configChronic.id, currentConfig.id));
            }

            // Close any configs that overlap with the new config's start date
            // This handles cases where we're inserting in the past or future
            for (const config of allConfigs) {
                const configValidFrom = new Date(config.validFrom);
                const configValidUntil = config.validUntil ? new Date(config.validUntil) : null;

                // Skip if this is the current config (already handled above)
                if (currentConfig && config.id === currentConfig.id) {
                    continue;
                }

                // If config overlaps with new start date, close it
                const overlaps = 
                    (configValidUntil === null || configValidUntil > validFromDate) &&
                    configValidFrom < validFromDate;

                if (overlaps) {
                    await db
                        .update(configChronic)
                        .set({
                            validUntil: validFromDate,
                        })
                        .where(eq(configChronic.id, config.id));
                }
            }

            // Create the new config
            const newConfig = await db.insert(configChronic).values({
                userId,
                configType: "tracked_projects",
                value: JSON.stringify({
                    projectIds: data.projectIds,
                    projectNames: data.projectNames,
                } as TrackedProjectsValue),
                validFrom: validFromDate,
                validUntil: null, // New config is current until superseded
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
 * Returns all historical configurations ordered by validFrom (ascending - chronological order)
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
                orderBy: (configChronic, { asc }) => [asc(configChronic.validFrom)],
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

/**
 * Deletes all historical configurations (where validUntil is NOT NULL)
 * Keeps only the current configuration
 */
export const deleteConfigHistory = createServerFn({ method: "POST" })
    .inputValidator((data: { configType: string } | undefined) => data)
    .handler(async ({ data, request }) => {
        const userId = await getAuthenticatedUserId(request);
        const configType = data?.configType || "tracked_projects";

        try {
            // Delete all historical configs (where validUntil is NOT NULL)
            const deleted = await db
                .delete(configChronic)
                .where(
                    and(
                        eq(configChronic.userId, userId),
                        eq(configChronic.configType, configType as "tracked_projects"),
                        // Only delete historical records (not the current one)
                        not(isNull(configChronic.validUntil))
                    )
                )
                .returning();

            return {
                success: true,
                deletedCount: deleted.length,
            };
        } catch (error) {
            console.error("Error deleting config history:", error);
            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to delete config history",
            };
        }
    });

/**
 * Deletes a single configuration entry by ID
 */
export const deleteConfigEntry = createServerFn({ method: "POST" })
    .inputValidator((data: { configId: string }) => data)
    .handler(async ({ data, request }) => {
        const userId = await getAuthenticatedUserId(request);

        try {
            // First verify the config belongs to the user
            const config = await db.query.configChronic.findFirst({
                where: and(
                    eq(configChronic.id, data.configId),
                    eq(configChronic.userId, userId)
                ),
            });

            if (!config) {
                return {
                    success: false,
                    error: "Configuration entry not found or unauthorized",
                };
            }

            // Delete the config entry
            const deleted = await db
                .delete(configChronic)
                .where(eq(configChronic.id, data.configId))
                .returning();

            return {
                success: true,
                deletedCount: deleted.length,
            };
        } catch (error) {
            console.error("Error deleting config entry:", error);
            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to delete config entry",
            };
        }
    });

