const DEFAULT_MIN_INTERVAL_MS = 350;

let lastRequestAt = 0;
let queue: Promise<void> = Promise.resolve();

function getMinIntervalMs(): number {
  const raw = process.env.CLOCKIFY_RATE_LIMIT_MS;
  if (!raw) return DEFAULT_MIN_INTERVAL_MS;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return DEFAULT_MIN_INTERVAL_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Global rate limiter for all Clockify API calls.
 * Serializes requests with a minimum spacing to reduce 429s.
 */
export function waitForClockifyRateLimit(): Promise<void> {
  const minIntervalMs = getMinIntervalMs();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const run = queue.then(async () => {
    const now = Date.now();
    const waitMs = Math.max(0, lastRequestAt + minIntervalMs - now);
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    lastRequestAt = Date.now();
    release();
  });

  queue = run.catch(() => undefined);
  return gate;
}
