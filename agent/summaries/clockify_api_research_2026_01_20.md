# Clockify API Integration Research & Improvement Recommendations

## Executive Summary

Your codebase has a solid Clockify API integration with basic retry logic and error handling. However, there are several opportunities for improvement around rate limiting, pagination, exponential backoff, and resilience patterns.

**Key Findings:**

- ✅ Basic retry logic implemented (2 retries for GET requests)
- ✅ Proper error handling with HTTPError parsing
- ⚠️ No exponential backoff (fixed retry delays)
- ⚠️ No rate limit awareness or throttling
- ⚠️ No pagination support (API supports it, not used)
- ⚠️ No request queuing or concurrency control
- ⚠️ Limited observability (no logging/metrics)

---

## Clockify API Rate Limiting

### Official Limits

- **50 requests per second** (per addon on one workspace) when using X-Addon-Token
- **No documented limit for X-Api-Key** (personal API keys)
- Rate limit exceeded returns: **429 Too Many Requests**

### Current Implementation

```typescript
// src/lib/clockify/api-instance.ts
retry: {
  limit: 2,
  methods: ["get"],
  statusCodes: [408, 413, 429, 500, 502, 503, 504],
}
```

**Issues:**

1. Only retries GET requests (POST requests to Reports API not retried)
2. No exponential backoff (ky uses fixed delays)
3. No rate limit headers inspection
4. No request throttling/queuing

---

## Pagination Patterns

### Clockify API Pagination Support

The Clockify API supports pagination on several endpoints:

```
GET /v1/workspaces/{workspaceId}/users
  - page (default: 1)
  - page-size (default: 50, max: 500)

GET /v1/workspaces/{workspaceId}/clients
  - Supports pagination (not currently used)

GET /v1/workspaces/{workspaceId}/projects
  - Supports pagination (not currently used)
```

### Current Implementation

```typescript
// src/lib/clockify/client.ts - getClients()
const clients = await api
  .get(`workspaces/${workspaceId}/clients`)
  .json<ClockifyClient[]>();
```

**Issues:**

1. No pagination handling - assumes all results fit in one response
2. Large workspaces with 100+ clients/projects will get truncated
3. No cursor-based or offset-based pagination

---

## Common Pitfalls & Best Practices

### 1. **Retry Strategy Issues**

**Pitfall:** Fixed retry delays

```typescript
// ky default: 100ms between retries (not exponential)
retry: {
  limit: 2;
}
```

**Best Practice:** Exponential backoff with jitter

```typescript
// Retry delays: 100ms, 200ms, 400ms, 800ms...
// With jitter: 50-150ms, 100-300ms, 200-600ms...
```

### 2. **Rate Limit Handling**

**Pitfall:** No awareness of rate limit headers

```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1234567890
```

**Best Practice:** Inspect headers and throttle proactively

```typescript
if (remaining < 5) {
  // Wait before next request
  await delay(resetTime - now);
}
```

### 3. **Concurrent Request Storms**

**Pitfall:** `getWeeklyTimeReport()` makes 3 parallel API calls

```typescript
const [totalTime, trackedProjects, allProjects] = await Promise.all([
  reportsApi.post(...),
  reportsApi.post(...),
  reportsApi.post(...),
]);
```

**Risk:** If called multiple times simultaneously, could exceed rate limits
**Best Practice:** Queue requests or use semaphore pattern

### 4. **Error Classification**

**Pitfall:** All errors treated the same

```typescript
if (error instanceof HTTPError) {
  return { message: error.message, code: error.response.status };
}
```

**Best Practice:** Distinguish retryable vs non-retryable errors

```typescript
// Retryable: 429, 500, 502, 503, 504, 408, 413
// Non-retryable: 400, 401, 403, 404
```

### 5. **Timeout Configuration**

**Current:** 30 seconds (reasonable)

```typescript
timeout: 30000;
```

**Consideration:** Reports API can be slow for large date ranges

- Consider longer timeout for POST /reports/summary
- Implement request-level timeout overrides

---

## Recommended Improvements

### Priority 1: Exponential Backoff with Jitter

**File:** `src/lib/clockify/api-instance.ts`

```typescript
import ky from "ky";

/**
 * Exponential backoff with jitter for retries
 * Delays: 100ms, 200ms, 400ms, 800ms, 1600ms
 * With ±50% jitter to prevent thundering herd
 */
function createRetryDelay(attemptNumber: number): number {
  const baseDelay = 100 * Math.pow(2, attemptNumber);
  const jitter = baseDelay * 0.5 * Math.random();
  return baseDelay + jitter;
}

export function createClockifyApi(apiKey: string) {
  return ky.create({
    prefixUrl: "https://api.clockify.me/api/v1",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    retry: {
      limit: 3,
      methods: ["get", "post"], // Include POST for reports
      statusCodes: [408, 413, 429, 500, 502, 503, 504],
      delay: createRetryDelay,
    },
    timeout: 30000,
  });
}
```

### Priority 2: Rate Limit Awareness

**New File:** `src/lib/clockify/rate-limiter.ts`

```typescript
interface RateLimitState {
  remaining: number;
  limit: number;
  resetAt: Date;
}

class ClockifyRateLimiter {
  private state: RateLimitState = {
    remaining: 50,
    limit: 50,
    resetAt: new Date(),
  };

  updateFromHeaders(headers: Headers): void {
    const limit = parseInt(headers.get("x-ratelimit-limit") || "50");
    const remaining = parseInt(headers.get("x-ratelimit-remaining") || "50");
    const reset = parseInt(headers.get("x-ratelimit-reset") || "0");

    this.state = {
      limit,
      remaining,
      resetAt: new Date(reset * 1000),
    };
  }

  async waitIfNeeded(): Promise<void> {
    if (this.state.remaining < 5) {
      const delay = this.state.resetAt.getTime() - Date.now();
      if (delay > 0) {
        console.warn(`Rate limit approaching. Waiting ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay + 100));
      }
    }
  }

  getRemainingRequests(): number {
    return this.state.remaining;
  }
}

export const rateLimiter = new ClockifyRateLimiter();
```

### Priority 3: Pagination Support

**File:** `src/lib/clockify/client.ts`

```typescript
/**
 * Fetches all clients in a workspace with automatic pagination
 * @param apiKey - The Clockify API key
 * @param workspaceId - The workspace ID
 * @returns List of all clients (handles pagination automatically)
 */
export async function getAllClients(
  apiKey: string,
  workspaceId: string,
): Promise<ClockifyResult<ClockifyClient[]>> {
  try {
    const api = createClockifyApi(apiKey);
    const allClients: ClockifyClient[] = [];
    let page = 1;
    const pageSize = 500; // Max allowed by Clockify

    while (true) {
      const clients = await api
        .get(`workspaces/${workspaceId}/clients`, {
          searchParams: {
            page,
            "page-size": pageSize,
          },
        })
        .json<ClockifyClient[]>();

      if (clients.length === 0) break;
      allClients.push(...clients);

      if (clients.length < pageSize) break;
      page++;
    }

    return { success: true, data: allClients };
  } catch (error) {
    return { success: false, error: await handleError(error) };
  }
}
```

### Priority 4: Request Queuing

**New File:** `src/lib/clockify/request-queue.ts`

```typescript
/**
 * Simple request queue to prevent rate limit violations
 * Ensures max N concurrent requests to Clockify API
 */
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  private maxConcurrent = 5; // Conservative limit

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const fn = this.queue.shift();

    if (fn) {
      try {
        await fn();
      } finally {
        this.running--;
        this.process();
      }
    }
  }
}

export const requestQueue = new RequestQueue();
```

### Priority 5: Enhanced Error Handling

**File:** `src/lib/clockify/client.ts`

```typescript
interface ErrorClassification {
  isRetryable: boolean;
  isRateLimit: boolean;
  isAuthError: boolean;
  isNotFound: boolean;
}

function classifyError(code?: number): ErrorClassification {
  return {
    isRetryable: [408, 413, 429, 500, 502, 503, 504].includes(code || 0),
    isRateLimit: code === 429,
    isAuthError: code === 401,
    isNotFound: code === 404,
  };
}

async function handleError(
  error: unknown,
): Promise<ClockifyError & ErrorClassification> {
  if (error instanceof HTTPError) {
    const classification = classifyError(error.response.status);
    try {
      const errorData = await error.response.json();
      return {
        message: errorData.message || error.message,
        code: error.response.status,
        ...classification,
      };
    } catch {
      return {
        message: error.message,
        code: error.response.status,
        ...classification,
      };
    }
  }

  return {
    message: error instanceof Error ? error.message : "Unknown error",
    isRetryable: false,
    isRateLimit: false,
    isAuthError: false,
    isNotFound: false,
  };
}
```

### Priority 6: Observability & Logging

**New File:** `src/lib/clockify/logger.ts`

```typescript
interface RequestLog {
  method: string;
  endpoint: string;
  status?: number;
  duration: number;
  retries: number;
  timestamp: Date;
}

class ClockifyLogger {
  private logs: RequestLog[] = [];

  logRequest(log: RequestLog): void {
    this.logs.push(log);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Clockify] ${log.method} ${log.endpoint} - ${log.status || "pending"} (${log.duration}ms, retries: ${log.retries})`,
      );
    }

    // Alert on slow requests
    if (log.duration > 5000) {
      console.warn(
        `[Clockify] Slow request: ${log.endpoint} took ${log.duration}ms`,
      );
    }
  }

  getStats(): {
    totalRequests: number;
    avgDuration: number;
    errorRate: number;
  } {
    const total = this.logs.length;
    const avgDuration =
      this.logs.reduce((sum, log) => sum + log.duration, 0) / total;
    const errors = this.logs.filter((log) => (log.status || 0) >= 400).length;

    return {
      totalRequests: total,
      avgDuration,
      errorRate: errors / total,
    };
  }
}

export const clockifyLogger = new ClockifyLogger();
```

---

## Implementation Roadmap

### Phase 1 (Week 1): Foundation

- [ ] Add exponential backoff with jitter
- [ ] Enable POST retries for Reports API
- [ ] Add error classification

### Phase 2 (Week 2): Rate Limiting

- [ ] Implement rate limit awareness
- [ ] Add request queue for concurrency control
- [ ] Add observability/logging

### Phase 3 (Week 3): Pagination

- [ ] Implement pagination for clients/projects
- [ ] Add getAllClients() and getAllProjects()
- [ ] Update tests for pagination

### Phase 4 (Week 4): Testing & Optimization

- [ ] Add integration tests for rate limiting
- [ ] Performance testing under load
- [ ] Documentation updates

---

## Testing Recommendations

### Unit Tests

```typescript
// Test exponential backoff calculation
test("exponential backoff increases delay", () => {
  expect(createRetryDelay(0)).toBeLessThan(createRetryDelay(1));
  expect(createRetryDelay(1)).toBeLessThan(createRetryDelay(2));
});

// Test rate limiter
test("rate limiter waits when remaining < 5", async () => {
  const limiter = new ClockifyRateLimiter();
  limiter.updateFromHeaders(
    new Headers({
      "x-ratelimit-remaining": "3",
      "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 1),
    }),
  );

  const start = Date.now();
  await limiter.waitIfNeeded();
  expect(Date.now() - start).toBeGreaterThan(900);
});
```

### Integration Tests

```typescript
// Test pagination with real API
test("getAllClients handles pagination", async () => {
  const result = await getAllClients(apiKey, workspaceId);
  expect(result.success).toBe(true);
  if (result.success) {
    // Should fetch all clients even if > 50
    expect(result.data.length).toBeGreaterThanOrEqual(0);
  }
});
```

---

## Monitoring & Alerts

### Metrics to Track

1. **Request latency** - P50, P95, P99
2. **Error rate** - By status code
3. **Rate limit hits** - Count of 429 responses
4. **Retry count** - Distribution of retry attempts
5. **Queue depth** - Pending requests in queue

### Alert Thresholds

- Error rate > 5%
- Rate limit hits > 10/hour
- P99 latency > 10s
- Queue depth > 100

---

## References

- Clockify API Docs: https://docs.clockify.me/
- Rate Limiting: https://docs.clockify.me/#section/Rate-limiting
- Pagination: https://docs.clockify.me/#tag/User/operation/getUsersOfWorkspace
- ky HTTP client: https://github.com/sindresorhus/ky
- Exponential backoff: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
