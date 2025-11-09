import ky from "ky";

/**
 * Creates a configured ky instance for Clockify Reports API requests
 * @param apiKey - The user's Clockify API key
 * @returns Configured ky instance with base URL and authentication header
 */
export function createClockifyReportsApi(apiKey: string) {
    return ky.create({
        prefixUrl: "https://reports.api.clockify.me/v1",
        headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
        },
        retry: {
            limit: 2,
            methods: ["get", "post"],
            statusCodes: [408, 413, 429, 500, 502, 503, 504],
        },
        timeout: 30000, // 30 seconds
    });
}
