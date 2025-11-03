import { z } from "zod/v4";

export const envStore = z.object({
    DATABASE_URL: z.string(),
    // Security: Allow user signup (defaults to false for security)
    ALLOW_USER_SIGNUP: z
        .enum(["true", "false"])
        .default("false")
        .transform((val) => val === "true"),
    // Admin user credentials for initial registration & basic permission checks
    ADMIN_EMAIL: z.email(),
    ADMIN_LABEL: z.string(),
    ADMIN_PASSWORD: z.string(),
}).parse(process.env);
