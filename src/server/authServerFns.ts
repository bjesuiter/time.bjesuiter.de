import { auth } from "@/lib/auth/auth";

/**
 * Wrapper for the Better Auth HTTP handler.
 *
 * This is NOT a createServerFn because we need to pass/return raw Request/Response objects.
 * The Better Auth handler manages cookies, headers, and redirects directly.
 *
 * This file is safe to import from routes because it's in src/server/,
 * which keeps server-only imports (@/lib/auth/auth, @/db) out of route files.
 */
export async function handleAuthRequest(request: Request): Promise<Response> {
  return auth.handler(request);
}
