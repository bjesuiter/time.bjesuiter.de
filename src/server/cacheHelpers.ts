import { db } from "@/db";
import { and, eq, gt, gte, isNull } from "drizzle-orm";
import {
  cachedDailyProjectSums,
  cachedWeeklySums,
} from "@/db/schema/cache";
import { logger } from "@/lib/logger";

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
