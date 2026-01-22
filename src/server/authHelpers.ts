import { auth } from "@/lib/auth/auth";

/**
 * Helper to get authenticated user ID
 * Better-auth with reactStartCookies plugin reads cookies from request headers
 */
export async function getAuthenticatedUserId(headers: Headers): Promise<string> {
  const session = await auth.api.getSession({
    headers,
  });

  if (!session?.user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return session.user.id;
}
