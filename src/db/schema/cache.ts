import {
  integer,
  real,
  sqliteTable,
  text,
  index,
} from "drizzle-orm/sqlite-core";
import { user } from "./better-auth";

export const cachedDailyProjectSums = sqliteTable(
  "cached_daily_project_sums",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    projectId: text("project_id").notNull(),
    projectName: text("project_name").notNull(),
    clientId: text("client_id").notNull(),
    seconds: integer("seconds").notNull(),
    calculatedAt: integer("calculated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    invalidatedAt: integer("invalidated_at", { mode: "timestamp_ms" }),
  },
  (table) => ({
    userDateIdx: index("cached_daily_user_date_idx").on(
      table.userId,
      table.date,
    ),
    userProjectIdx: index("cached_daily_user_project_idx").on(
      table.userId,
      table.projectId,
      table.date,
    ),
    invalidatedIdx: index("cached_daily_invalidated_idx").on(
      table.invalidatedAt,
    ),
  }),
);

export const cachedWeeklySums = sqliteTable(
  "cached_weekly_sums",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    weekStart: text("week_start").notNull(),
    weekEnd: text("week_end").notNull(),
    clientId: text("client_id").notNull(),
    totalSeconds: integer("total_seconds").notNull(),
    regularHoursBaseline: real("regular_hours_baseline").notNull(),
    overtimeSeconds: integer("overtime_seconds").notNull(),
    cumulativeOvertimeSeconds: integer("cumulative_overtime_seconds"),
    configSnapshotId: text("config_snapshot_id"),
    status: text("status", { enum: ["pending", "committed"] })
      .notNull()
      .default("pending"),
    committedAt: integer("committed_at", { mode: "timestamp_ms" }),
    calculatedAt: integer("calculated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    invalidatedAt: integer("invalidated_at", { mode: "timestamp_ms" }),
  },
  (table) => ({
    userWeekIdx: index("cached_weekly_user_week_idx").on(
      table.userId,
      table.weekStart,
    ),
    statusIdx: index("cached_weekly_status_idx").on(table.userId, table.status),
    invalidatedIdx: index("cached_weekly_invalidated_idx").on(
      table.invalidatedAt,
    ),
  }),
);

export const weeklyDiscrepancies = sqliteTable(
  "weekly_discrepancies",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    weekStart: text("week_start").notNull(),
    originalTotalSeconds: integer("original_total_seconds").notNull(),
    newTotalSeconds: integer("new_total_seconds").notNull(),
    differenceSeconds: integer("difference_seconds").notNull(),
    detectedAt: integer("detected_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
    resolution: text("resolution", { enum: ["accepted", "dismissed"] }),
  },
  (table) => ({
    userWeekIdx: index("discrepancy_user_week_idx").on(
      table.userId,
      table.weekStart,
    ),
    unresolvedIdx: index("discrepancy_unresolved_idx").on(
      table.userId,
      table.resolvedAt,
    ),
  }),
);

export const cacheSchemas = {
  cachedDailyProjectSums,
  cachedWeeklySums,
  weeklyDiscrepancies,
};
