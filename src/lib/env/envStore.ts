import { z } from "zod/v4";

export const envStore = z.object({
    DATABASE_URL: z.string(),
    // Security: Allow user signup (defaults to false for security)
    ALLOW_USER_SIGNUP: z
        .enum(["true", "false"])
        .default("false")
        .transform((val) => val === "true"),
}).parse(process.env);
