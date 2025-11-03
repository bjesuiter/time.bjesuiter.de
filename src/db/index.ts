import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { envStore } from "@/lib/env/envStore";
import { betterAuthSchemas } from "./schema/better-auth";

// Remove 'file:' prefix from DATABASE_URL if present
const dbPath = envStore.DATABASE_URL.replace(/^file:/, "");

const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, {
    schema: {
        ...betterAuthSchemas,
    },
});
