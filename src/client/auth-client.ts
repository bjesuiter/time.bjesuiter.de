import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain)
   * If you're using a different base path other than /api/auth
   * make sure to pass the whole URL including the path.
   * (e.g. http://localhost:3000/custom-path/auth)
   */
  // baseURL: import.meta.env.VITE_BETTER_AUTH_URL,
});
