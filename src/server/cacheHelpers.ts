import { db } from "@/db";
import { and, eq, gte, isNull } from "drizzle-orm";
import {
  cachedDailyProjectSums,
  cachedWeeklySums,
} from "@/db/schema/cache";

/**
 * Internal helper to invalidate cache from a specific date forward.
 * Separate file to avoid circular imports between cacheServerFns and configServerFns.
 */
export async function invalidateCacheFromDate(
  userId: string,
  fromDate: string,
): Promise<{ invalidatedAt: Date }> {
  const now = new Date();

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
