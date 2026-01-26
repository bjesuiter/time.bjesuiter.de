import { getStartContext } from "@tanstack/start-storage-context";
import { auth } from "@/lib/auth/auth";

/**
 * Helper to get authenticated user ID
 * Better-auth with reactStartCookies plugin reads cookies from request headers
 */
export async function getAuthenticatedUserId(): Promise<string> {
  const { request } = getStartContext();
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return session.user.id;
}
