import ky from "ky";

const RETRY_LIMIT = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

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
    retry: {
      limit: RETRY_LIMIT,
      methods: ["get"],
      statusCodes: [408, 413, 429, 500, 502, 503, 504],
      delay: exponentialBackoffDelay,
    },
    timeout: 30000,
  });
}
