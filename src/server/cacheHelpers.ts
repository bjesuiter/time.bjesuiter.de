import { db } from "@/db";
import { and, eq, gt, gte, isNull } from "drizzle-orm";
import {
  cachedDailyProjectSums,
  cachedWeeklySums,
} from "@/db/schema/cache";
import { logger } from "@/lib/logger";
import { addWeeks, startOfWeek, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { parseLocalDateInTz, toISODate } from "@/lib/date-utils";

/**
 * Cache Operations Guide:
 * 
 * 1. WEEKLY TIME DATA CACHE (daily sums, weekly totals)
 *    - Source: Clockify API
 *    - Populated by: calculateAndCacheDailySums, calculateAndCacheWeeklySums
 *    - Invalidation trigger: User clicks refresh
 *    - Effect: Refetch from Clockify, recalculate weekly overtime
 * 
 * 2. CUMULATIVE OVERTIME CACHE
 *    - Source: Derived from weekly overtime + previous cumulative
 *    - Populated by: recalculateCumulativeOvertimeFromCache
 *    - Invalidation triggers:
 *      a) Weekly overtime of this week changed
 *      b) Cumulative overtime of previous week changed
 *    - Effect: Recalculate from cached weekly data (NO Clockify call)
 * 
 * Key principle: Cumulative overtime recalculation NEVER calls Clockify.
 * If weekly data is missing, cumulative calculation should fail/skip.
 */

/**
 * Invalidates cache from a specific date forward.
 * Marks both daily and weekly cache entries as invalidated.
 */
export async function invalidateCacheFromDate(
  userId: string,
  fromDate: string,
): Promise<{ invalidatedAt: Date }> {
  const now = new Date();

  logger.info("invalidateCacheFromDate: invalidating cache", {
    userId,
    fromDate,
  });

  await db
    .update(cachedDailyProjectSums)
    .set({ invalidatedAt: now })
    .where(
      and(
        eq(cachedDailyProjectSums.userId, userId),
        gte(cachedDailyProjectSums.date, fromDate),
        isNull(cachedDailyProjectSums.invalidatedAt),
      ),
    );

  await db
    .update(cachedWeeklySums)
    .set({ invalidatedAt: now })
    .where(
      and(
        eq(cachedWeeklySums.userId, userId),
        gte(cachedWeeklySums.weekStart, fromDate),
        isNull(cachedWeeklySums.invalidatedAt),
      ),
    );

  return { invalidatedAt: now };
}

/**
 * Clears cumulative overtime for all weeks after a given date.
 * Used when weekly overtime changes and cumulative needs recalculation.
 * Does NOT call Clockify - only clears derived cumulative values.
 */
export async function invalidateCumulativeOvertimeAfterWeek(
  userId: string,
  weekStartDate: string,
): Promise<{ clearedCount: number }> {
  logger.info("invalidateCumulativeOvertimeAfterWeek: clearing cumulative overtime", {
    userId,
    afterWeek: weekStartDate,
  });

  const result = await db
    .update(cachedWeeklySums)
    .set({ cumulativeOvertimeSeconds: null })
    .where(
      and(
        eq(cachedWeeklySums.userId, userId),
        gt(cachedWeeklySums.weekStart, weekStartDate),
        isNull(cachedWeeklySums.invalidatedAt),
      ),
    );

  const clearedCount = result.rowsAffected ?? 0;

  logger.info("invalidateCumulativeOvertimeAfterWeek: cleared cumulative for weeks", {
    clearedCount,
  });

  return { clearedCount };
}

/**
 * Recalculates cumulative overtime for a specific week using ONLY cached weekly data.
 * This function NEVER calls Clockify - if weekly data is missing, returns null.
 * 
 * Returns the calculated cumulative overtime in seconds, or null if calculation failed
 * due to missing weekly data.
 */
export async function recalculateCumulativeOvertimeFromCache(
  userId: string,
  weekStartDate: string,
  previousCumulativeSeconds: number | null,
): Promise<{ cumulativeSeconds: number | null; weekOvertimeUsed: number | null }> {
  logger.debug("recalculateCumulativeOvertimeFromCache: starting", {
    userId,
    weekStartDate,
    previousCumulativeSeconds,
  });

  const weeklyCache = await db.query.cachedWeeklySums.findFirst({
    where: and(
      eq(cachedWeeklySums.userId, userId),
      eq(cachedWeeklySums.weekStart, weekStartDate),
      isNull(cachedWeeklySums.invalidatedAt),
    ),
  });

  if (!weeklyCache || weeklyCache.overtimeSeconds === null) {
    logger.warn("recalculateCumulativeOvertimeFromCache: no cached weekly overtime", {
      weekStartDate,
      hasCacheEntry: !!weeklyCache,
    });
    return { cumulativeSeconds: null, weekOvertimeUsed: null };
  }

  const weekOvertime = weeklyCache.overtimeSeconds;
  const previousCumulative = previousCumulativeSeconds ?? 0;
  const newCumulative = previousCumulative + weekOvertime;

  await db
    .update(cachedWeeklySums)
    .set({ cumulativeOvertimeSeconds: newCumulative })
    .where(eq(cachedWeeklySums.id, weeklyCache.id));

  logger.debug("recalculateCumulativeOvertimeFromCache: calculated", {
    weekStartDate,
    weekOvertime,
    previousCumulative,
    newCumulative,
  });

  return { cumulativeSeconds: newCumulative, weekOvertimeUsed: weekOvertime };
}

/**
 * Context for cumulative overtime calculation.
 * Passed through recursive calls to avoid repeated DB lookups.
 */
export interface CumulativeOvertimeContext {
  userId: string;
  firstWeekStart: string; // ISO date string - the config start week
  weekStartSetting: "MONDAY" | "SUNDAY";
  userTimeZone: string;
}

/**
 * Result of cumulative overtime calculation for a week.
 */
export interface CumulativeOvertimeResult {
  weekStartDate: string;
  weeklyOvertimeSeconds: number | null;
  cumulativeOvertimeSeconds: number;
  fromCache: boolean;
  calculatedPreviousWeeks: number; // How many previous weeks were recursively calculated
}

function getPreviousWeekStart(weekStartDate: string, userTimeZone: string): string {
  const currentWeek = parseLocalDateInTz(weekStartDate, userTimeZone);
  const previousWeek = addWeeks(currentWeek, -1);
  const normalizedPrevWeek = setMilliseconds(
    setSeconds(setMinutes(setHours(previousWeek, 0), 0), 0),
    0,
  );
  return toISODate(normalizedPrevWeek);
}

/**
 * Recursively calculates cumulative overtime for a specific week.
 * 
 * Algorithm:
 * 1. If this week is before the config start date → return 0 (base case)
 * 2. Check cache for this week's cumulative overtime → if found, return it
 * 3. Otherwise, recursively get previous week's cumulative
 * 4. Add this week's overtime to previous cumulative
 * 5. Store result in cache and return
 * 
 * Key principle: This function NEVER calls Clockify API.
 * If weekly overtime data is missing, it skips that week (logs warning).
 * 
 * @param weekStartDate - ISO date string (YYYY-MM-DD) for the week to calculate
 * @param ctx - Calculation context with user info and config
 * @param forceRecalculate - If true, ignores cached cumulative and recalculates
 * @returns Cumulative overtime result with calculation metadata
 */
export async function calculateCumulativeOvertimeRecursive(
  weekStartDate: string,
  ctx: CumulativeOvertimeContext,
  forceRecalculate: boolean = false,
): Promise<CumulativeOvertimeResult> {
  logger.debug("calculateCumulativeOvertimeRecursive: starting", {
    weekStartDate,
    firstWeekStart: ctx.firstWeekStart,
    forceRecalculate,
  });

  // Base case: week is before the config start date
  if (weekStartDate < ctx.firstWeekStart) {
    logger.debug("calculateCumulativeOvertimeRecursive: week before config start", {
      weekStartDate,
      firstWeekStart: ctx.firstWeekStart,
    });
    return {
      weekStartDate,
      weeklyOvertimeSeconds: null,
      cumulativeOvertimeSeconds: 0,
      fromCache: false,
      calculatedPreviousWeeks: 0,
    };
  }

  // Try to use cached cumulative value (unless force recalculate)
  const cachedWeek = await db.query.cachedWeeklySums.findFirst({
    where: and(
      eq(cachedWeeklySums.userId, ctx.userId),
      eq(cachedWeeklySums.weekStart, weekStartDate),
      isNull(cachedWeeklySums.invalidatedAt),
    ),
  });

  // If we have a cached cumulative value and not forcing recalculate, use it
  if (!forceRecalculate && 
      cachedWeek?.cumulativeOvertimeSeconds !== null && 
      cachedWeek?.cumulativeOvertimeSeconds !== undefined) {
    logger.debug("calculateCumulativeOvertimeRecursive: using cached cumulative", {
      weekStartDate,
      cachedCumulative: cachedWeek.cumulativeOvertimeSeconds,
    });
    return {
      weekStartDate,
      weeklyOvertimeSeconds: cachedWeek.overtimeSeconds,
      cumulativeOvertimeSeconds: cachedWeek.cumulativeOvertimeSeconds,
      fromCache: true,
      calculatedPreviousWeeks: 0,
    };
  }

  // Get this week's overtime from cache
  const weeklyOvertime = cachedWeek?.overtimeSeconds ?? null;
  
  if (weeklyOvertime === null) {
    logger.warn("calculateCumulativeOvertimeRecursive: no weekly overtime data", {
      weekStartDate,
      message: "Weekly data must be refreshed from Clockify first",
    });
  }

  // Check if this is the first week (no previous week to recurse to)
  const isFirstWeek = weekStartDate === ctx.firstWeekStart;

  let previousCumulative = 0;
  let calculatedPreviousWeeks = 0;

  if (!isFirstWeek) {
    // Recurse to get previous week's cumulative
    const previousWeekStart = getPreviousWeekStart(weekStartDate, ctx.userTimeZone);
    const previousResult = await calculateCumulativeOvertimeRecursive(
      previousWeekStart,
      ctx,
      forceRecalculate,
    );
    previousCumulative = previousResult.cumulativeOvertimeSeconds;
    calculatedPreviousWeeks = previousResult.calculatedPreviousWeeks + (previousResult.fromCache ? 0 : 1);
  }

  // Calculate new cumulative: previous cumulative + this week's overtime
  const newCumulative = previousCumulative + (weeklyOvertime ?? 0);

  // Store in cache if we have a cache entry
  if (cachedWeek) {
    await db
      .update(cachedWeeklySums)
      .set({ cumulativeOvertimeSeconds: newCumulative })
      .where(eq(cachedWeeklySums.id, cachedWeek.id));

    logger.debug("calculateCumulativeOvertimeRecursive: stored in cache", {
      weekStartDate,
      weeklyOvertime,
      previousCumulative,
      newCumulative,
    });
  } else {
    logger.debug("calculateCumulativeOvertimeRecursive: no cache entry to update", {
      weekStartDate,
      newCumulative,
    });
  }

  return {
    weekStartDate,
    weeklyOvertimeSeconds: weeklyOvertime,
    cumulativeOvertimeSeconds: newCumulative,
    fromCache: false,
    calculatedPreviousWeeks,
  };
}

/**
 * Calculate cumulative overtime for a week, creating the context from user config.
 * This is the main entry point for cumulative calculation.
 * 
 * @param userId - The user's ID
 * @param weekStartDate - ISO date string for the week to calculate
 * @param configStartDate - ISO date string for when overtime tracking started
 * @param weekStartSetting - User's week start preference (MONDAY or SUNDAY)
 * @param userTimeZone - User's timezone
 * @param forceRecalculate - If true, recalculates all cumulative values (not weekly data)
 */
export async function calculateCumulativeOvertime(
  userId: string,
  weekStartDate: string,
  configStartDate: string,
  weekStartSetting: "MONDAY" | "SUNDAY",
  userTimeZone: string,
  forceRecalculate: boolean = false,
): Promise<CumulativeOvertimeResult> {
  const configStart = parseLocalDateInTz(configStartDate, userTimeZone);
  const firstWeekStart = startOfWeek(configStart, { weekStartsOn: weekStartSetting === "MONDAY" ? 1 : 0 });
  const firstWeekStartStr = toISODate(
    setMilliseconds(setSeconds(setMinutes(setHours(firstWeekStart, 0), 0), 0), 0)
  );

  const ctx: CumulativeOvertimeContext = {
    userId,
    firstWeekStart: firstWeekStartStr,
    weekStartSetting,
    userTimeZone,
  };

  logger.info("calculateCumulativeOvertime: starting calculation", {
    userId,
    weekStartDate,
    configStartDate,
    firstWeekStartStr,
    forceRecalculate,
  });

  return calculateCumulativeOvertimeRecursive(weekStartDate, ctx, forceRecalculate);
}
