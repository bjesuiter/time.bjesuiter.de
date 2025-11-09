import { drizzle } from "drizzle-orm/libsql";
import { envStore } from "@/lib/env/envStore";
import { betterAuthSchemas } from "./schema/better-auth";

// Validate DATABASE_URL is present (server-side only)
if (!envStore.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
}
const dbPath = envStore.DATABASE_URL;
export const db = drizzle(dbPath, {
    schema: {
        ...betterAuthSchemas,
    },
});
