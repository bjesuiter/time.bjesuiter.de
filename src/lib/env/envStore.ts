import { z } from "zod/v4";

/**
 * Environment variables schema
 * This is used to validate the environment variables at runtime
 * and to provide type safety for the environment variables
 * in the server and client code.
 *
 * IMPORTANT: Only import this in tanstack/start server functions or other code running purely on the server.
 * Do not import this in client code or route loaders/components!
 */
export const envStore = z.object({
    ENVIRONMENT: z.enum(["dev", "prod", "test"]),
    // Server-only: Database connection
    DATABASE_URL: z.string(),
    // Server-only: Security - Allow user signup (defaults to false for security)
    ALLOW_USER_SIGNUP: z
        .enum(["true", "false"])
        .default("false")
        .transform((val) => val === "true"),
    // Server-only: Admin user credentials for initial registration & basic permission checks
    ADMIN_EMAIL: z.email(),
    ADMIN_LABEL: z.string(),
    ADMIN_PASSWORD: z.string(),
}).parse(process.env);
