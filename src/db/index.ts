import { drizzle } from "drizzle-orm/d1";
import { betterAuthSchemas } from "./schema/better-auth";
import { clockifySchemas } from "./schema/clockify";
import { configSchemas } from "./schema/config";
import { cacheSchemas } from "./schema/cache";

const schema = {
  ...betterAuthSchemas,
  ...clockifySchemas,
  ...configSchemas,
  ...cacheSchemas,
};

export type AppDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: AppDb | null = null;
let _envPromise: Promise<Cloudflare.Env> | null = null;

async function getEnv(): Promise<Cloudflare.Env> {
  if (!_envPromise) {
    // cloudflare:env is only available in Cloudflare Workers runtime
    _envPromise = import("cloudflare:env").then((m) => m.env as Cloudflare.Env);
  }
  return _envPromise;
}

export async function getDb(): Promise<AppDb> {
  if (!_db) {
    const env = await getEnv();
    _db = drizzle(env.DB, { schema });
  }
  return _db;
}

export { schema };
