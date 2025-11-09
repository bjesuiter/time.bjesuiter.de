import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { user } from "./better-auth";

/**
 * Configuration Chronicle Table
 * 
 * Stores versioned configuration using Slowly Changing Dimension Type 2 pattern.
 * Each configuration change creates a new record with validFrom/validUntil timestamps.
 * 
 * Current config: validUntil = NULL
 * Historical config: validUntil = timestamp when it was superseded
 */
export const configChronic = sqliteTable(
  "config_chronic",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    configType: text("config_type", { 
      enum: ["tracked_projects"] 
    }).notNull(),
    // JSON value stored as text
    // For tracked_projects: { projectIds: string[], projectNames: string[] }
    value: text("value").notNull(),
    validFrom: integer("valid_from", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    validUntil: integer("valid_until", { mode: "timestamp_ms" }), // NULL = current
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    // Index for temporal queries
    temporalIdx: index("config_chronic_temporal_idx").on(
      table.userId,
      table.configType,
      table.validFrom,
      table.validUntil
    ),
  })
);

export const configSchemas = {
  configChronic,
};

