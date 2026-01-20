# Clockify API Improvements - Implementation Plan

**Date:** 2026-01-20  
**Status:** Research Complete - Ready for Implementation  
**Priority:** High (Affects reliability and scalability)

---

## Decision Summary

After researching Clockify API usage patterns and analyzing the current codebase, we've identified 4 critical issues and 6 priority improvements. This document outlines the implementation strategy.

### Critical Issues Found

1. **POST requests not retried** - Reports API failures have no automatic retry
2. **No rate limit awareness** - Risk of 429 errors under concurrent load
3. **No pagination** - Large workspaces get truncated data
4. **Concurrent request storms** - 3 parallel calls in `getWeeklyTimeReport()` could exceed limits

### Recommended Approach

**Phase-based implementation** (4 weeks):
- Week 1: Foundation (retries, backoff, error classification)
- Week 2: Resilience (rate limiting, queuing, logging)
- Week 3: Completeness (pagination, tests)
- Week 4: Validation (load testing, monitoring)

---

## Phase 1: Foundation (Week 1)

### Task 1.1: Enable POST Retries & Exponential Backoff

**Files to modify:**
- `src/lib/clockify/api-instance.ts`
- `src/lib/clockify/reports-api-instance.ts`

**Changes:**
```typescript
// BEFORE
retry: {
  limit: 2,
  methods: ["get"],
  statusCodes: [408, 413, 429, 500, 502, 503, 504],
}

// AFTER
function createRetryDelay(attemptNumber: number): number {
  const baseDelay = 100 * Math.pow(2, attemptNumber);
  const jitter = baseDelay * 0.5 * Math.random();
  return baseDelay + jitter;
}

retry: {
  limit: 3,
  methods: ["get", "post"],
  statusCodes: [408, 413, 429, 500, 502, 503, 504],
  delay: createRetryDelay,
}
```

**Effort:** 15 minutes  
**Testing:** Existing tests should pass; add unit test for backoff calculation

### Task 1.2: Add Error Classification

**File to modify:**
- `src/lib/clockify/client.ts`

**Changes:**
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

// Update handleError() to include classification
```

**Effort:** 20 minutes  
**Testing:** Add unit tests for each error type

---

## Phase 2: Resilience (Week 2)

### Task 2.1: Rate Limit Awareness

**New file:**
- `src/lib/clockify/rate-limiter.ts`

**Implementation:**
```typescript
class ClockifyRateLimiter {
  private state = {
    remaining: 50,
    limit: 50,
    resetAt: new Date(),
  };

  updateFromHeaders(headers: Headers): void {
    // Parse X-RateLimit-* headers
  }

  async waitIfNeeded(): Promise<void> {
    // Wait if remaining < 5
  }

  getRemainingRequests(): number {
    return this.state.remaining;
  }
}

export const rateLimiter = new ClockifyRateLimiter();
```

**Integration points:**
- Update `api-instance.ts` to call `rateLimiter.updateFromHeaders()`
- Update `client.ts` functions to call `rateLimiter.waitIfNeeded()`

**Effort:** 1-2 hours  
**Testing:** Unit tests for rate limit state management

### Task 2.2: Request Queuing

**New file:**
- `src/lib/clockify/request-queue.ts`

**Implementation:**
```typescript
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  private maxConcurrent = 5;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    // Queue request and process
  }

  private async process(): Promise<void> {
    // Process queued requests
  }
}

export const requestQueue = new RequestQueue();
```

**Integration points:**
- Wrap API calls in `requestQueue.enqueue()`
- Particularly important for `getWeeklyTimeReport()` parallel calls

**Effort:** 1-2 hours  
**Testing:** Unit tests for concurrency limits

### Task 2.3: Observability & Logging

**New file:**
- `src/lib/clockify/logger.ts`

**Implementation:**
```typescript
class ClockifyLogger {
  private logs: RequestLog[] = [];

  logRequest(log: RequestLog): void {
    // Log request details
  }

  getStats(): {
    totalRequests: number;
    avgDuration: number;
    errorRate: number;
  } {
    // Return statistics
  }
}

export const clockifyLogger = new ClockifyLogger();
```

**Effort:** 1 hour  
**Testing:** Unit tests for logging and stats

---

## Phase 3: Completeness (Week 3)

### Task 3.1: Pagination Support

**File to modify:**
- `src/lib/clockify/client.ts`

**New functions:**
```typescript
export async function getAllClients(
  apiKey: string,
  workspaceId: string,
): Promise<ClockifyResult<ClockifyClient[]>> {
  // Implement pagination loop
}

export async function getAllProjects(
  apiKey: string,
  workspaceId: string,
  clientId?: string,
): Promise<ClockifyResult<ClockifyProject[]>> {
  // Implement pagination loop
}
```

**Effort:** 2-3 hours  
**Testing:** Integration tests with real API

### Task 3.2: Update Tests

**Files to modify:**
- `tests/integration/clockify-api/*.test.ts`

**New tests:**
- Pagination with large result sets
- Rate limit header handling
- Retry behavior under failures
- Concurrent request handling

**Effort:** 2-3 hours

---

## Phase 4: Validation (Week 4)

### Task 4.1: Load Testing

**New file:**
- `tests/load/clockify-api.load.ts`

**Test scenarios:**
- 10 concurrent `getWeeklyTimeReport()` calls
- Verify no 429 errors
- Measure queue depth
- Monitor latency distribution

**Effort:** 2-3 hours

### Task 4.2: Documentation

**Updates:**
- Update `src/lib/clockify/README.md` with new patterns
- Add examples for rate limiting and pagination
- Document monitoring metrics

**Effort:** 1 hour

---

## Risk Assessment

### Low Risk
- Exponential backoff (ky handles internally)
- Error classification (additive, no breaking changes)
- Logging (observability only)

### Medium Risk
- Rate limiting (could delay requests)
- Request queuing (could affect latency)
- Pagination (changes API contract)

### Mitigation
- Implement behind feature flags initially
- Monitor metrics closely
- Gradual rollout to production
- Keep old functions available during transition

---

## Success Criteria

After implementation, verify:
- [ ] 429 error rate = 0 (was occasional before)
- [ ] P99 latency < 10 seconds (was 5-30s before)
- [ ] Retry count distribution (most requests 0 retries)
- [ ] Queue depth < 10 (no backlog)
- [ ] Rate limit remaining > 5 (proactive throttling)
- [ ] All tests passing
- [ ] Load test with 10 concurrent calls succeeds

---

## Timeline

| Week | Tasks | Effort | Status |
|------|-------|--------|--------|
| 1 | Retries, backoff, error classification | 1-2 hrs | Planned |
| 2 | Rate limiting, queuing, logging | 3-4 hrs | Planned |
| 3 | Pagination, tests | 4-6 hrs | Planned |
| 4 | Load testing, docs | 3-4 hrs | Planned |
| **Total** | | **11-16 hrs** | |

---

## Dependencies

- No external dependencies needed
- Uses existing `ky` HTTP client
- No database changes
- No API contract changes (backward compatible)

---

## Rollback Plan

If issues arise:
1. Revert to previous commit
2. Disable new features via feature flags
3. Investigate in staging environment
4. Re-implement with fixes

---

## Next Steps

1. Create bean for Phase 1 implementation
2. Assign developer
3. Start with Task 1.1 (15 min quick win)
4. Progress through phases sequentially
5. Monitor metrics after each phase

---

## References

- Full research: `agent/summaries/clockify_api_research_2026_01_20.md`
- Quick reference: `agent/summaries/CLOCKIFY_IMPROVEMENTS_SUMMARY.md`
- Clockify API: https://docs.clockify.me/
- Exponential backoff: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/

