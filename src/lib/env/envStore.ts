import { z } from "zod/v4";

export const envStore = z.object({
    DATABASE_URL: z.string(),
}).parse(process.env);
