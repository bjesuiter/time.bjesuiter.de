import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";
import { UsersTable } from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error("db/index.ts: DATABASE_URL is not set");
}

const client = new SQL(DATABASE_URL);

// You can specify any property from the bun sql connection options
export const db = drizzle({
    client,
    schema: { UsersTable },
});
