import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { envStore } from "@/lib/env/envStore";
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

// Only if not running in dev mode: Run migrations at module initialization
// Dev mode: the default bun dev command
if (envStore.ENVIRONMENT !== "dev") {
  console.log("Migrating database...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Database migrated successfully");
}

export { db };
