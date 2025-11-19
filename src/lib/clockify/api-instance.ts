import ky from "ky";

/**
 * Creates a configured ky instance for Clockify API requests
 * @param apiKey - The user's Clockify API key
 * @returns Configured ky instance with base URL and authentication header
 */
export function createClockifyApi(apiKey: string) {
  return ky.create({
    prefixUrl: "https://api.clockify.me/api/v1",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    retry: {
      limit: 2,
      methods: ["get"],
      statusCodes: [408, 413, 429, 500, 502, 503, 504],
    },
    timeout: 30000, // 30 seconds
  });
}
