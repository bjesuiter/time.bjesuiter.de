import { createServerFn } from "@tanstack/react-start";
import { envStore } from "@/lib/env/envStore";

/**
 * Exposes safe public environment variables to the client.
 * NEVER expose secrets here!
 */
export const getPublicEnv = createServerFn({ method: "GET" })
    .handler(async () => {
        return {
            allowUserSignup: envStore.ALLOW_USER_SIGNUP,
        };
    });

