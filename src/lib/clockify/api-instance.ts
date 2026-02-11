import ky from "ky";
import { logger } from "@/lib/logger";
import { waitForClockifyRateLimit } from "./rate-limit";

const RETRY_LIMIT = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const CLOCKIFY_DEBUG = process.env.CLOCKIFY_DEBUG === "true";
const requestStartTimes = new WeakMap<object, number>();

function logClockify(message: string, data: Record<string, unknown>) {
  if (!CLOCKIFY_DEBUG) return;
  logger.info(message, data);
}

function exponentialBackoffDelay(attemptCount: number): number {
  const delay = Math.min(
    BASE_DELAY_MS * Math.pow(2, attemptCount),
    MAX_DELAY_MS,
  );
  const jitter = Math.random() * 0.3 * delay;
  return delay + jitter;
}

export function createClockifyApi(apiKey: string) {
  return ky.create({
    prefixUrl: "https://api.clockify.me/api/v1",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    hooks: {
      beforeRequest: [
        async (_request, options) => {
          requestStartTimes.set(options, Date.now());
          logClockify("Clockify API request", {
            method: _request.method,
            url: _request.url,
          });
          await waitForClockifyRateLimit();
        },
      ],
      afterResponse: [
        async (request, options, response) => {
          const startedAt = requestStartTimes.get(options);
          const durationMs = startedAt ? Date.now() - startedAt : undefined;
          logClockify("Clockify API response", {
            method: request.method,
            url: request.url,
            status: response.status,
            durationMs,
          });
          return response;
        },
      ],
      beforeError: [
        async (error) => {
          const request = "request" in error ? error.request : undefined;
          const response = "response" in error ? error.response : undefined;
          const options = "options" in error ? error.options : undefined;
          const startedAt = options
            ? requestStartTimes.get(options)
            : undefined;
          const durationMs = startedAt ? Date.now() - startedAt : undefined;
          logClockify("Clockify API error", {
            method: request?.method,
            url: request?.url,
            status: response?.status,
            durationMs,
            message: error.message,
          });
          return error;
        },
      ],
    },
    retry: {
      limit: RETRY_LIMIT,
      methods: ["get"],
      statusCodes: [408, 413, 429, 500, 502, 503, 504],
      delay: exponentialBackoffDelay,
    },
    timeout: 30000,
  });
}
