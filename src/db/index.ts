import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";
import { envStore } from "@/lib/env/envStore";

const client = new SQL(envStore.DATABASE_URL);

// You can specify any property from the bun sql connection options
export const db = drizzle({
    client,
});
