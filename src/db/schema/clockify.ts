import {
  integer,
  index,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { user } from "./better-auth";

export const userClockifyConfig = sqliteTable(
  "user_clockify_config",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    clockifyApiKey: text("clockify_api_key").notNull(),
    clockifyWorkspaceId: text("clockify_workspace_id").notNull(),
    clockifyUserId: text("clockify_user_id").notNull(),
    timeZone: text("time_zone").notNull(),
    weekStart: text("week_start").notNull(), // "MONDAY" | "SUNDAY"
    selectedClientId: text("selected_client_id"),
    selectedClientName: text("selected_client_name"),
    regularHoursPerWeek: real("regular_hours_per_week").notNull().default(40),
    workingDaysPerWeek: integer("working_days_per_week").notNull().default(5),
    cumulativeOvertimeStartDate: text("cumulative_overtime_start_date"), // YYYY-MM-DD format
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    // Indexes for user-specific queries
    userIdx: index("user_clockify_config_user_id_idx").on(table.userId),
    workspaceIdx: index("user_clockify_config_workspace_idx").on(
      table.clockifyWorkspaceId,
    ),
  }),
);

export const clockifySchemas = {
  userClockifyConfig,
};
