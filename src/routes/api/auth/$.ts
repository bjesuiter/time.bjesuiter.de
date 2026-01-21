import { createFileRoute } from "@tanstack/react-router";
import { handleAuthRequest } from "@/server/authServerFns";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        return await handleAuthRequest(request);
      },
      POST: async ({ request }: { request: Request }) => {
        return await handleAuthRequest(request);
      },
    },
  },
});
