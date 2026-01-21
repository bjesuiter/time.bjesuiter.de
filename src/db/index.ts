import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { envStore } from "@/lib/env/envStore";
import { logger } from "@/lib/logger";
import { betterAuthSchemas } from "./schema/better-auth";
import { clockifySchemas } from "./schema/clockify";
import { configSchemas } from "./schema/config";
import { cacheSchemas } from "./schema/cache";
import { migrate } from "drizzle-orm/libsql/migrator";

if (!envStore.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = createClient({
  url: envStore.DATABASE_URL,
});

const db = drizzle(client, {
  schema: {
    ...betterAuthSchemas,
    ...clockifySchemas,
    ...configSchemas,
    ...cacheSchemas,
  },
});

if (envStore.ENVIRONMENT !== "dev") {
  logger.info("Migrating database...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  logger.info("Database migrated successfully");
}

export { db };
