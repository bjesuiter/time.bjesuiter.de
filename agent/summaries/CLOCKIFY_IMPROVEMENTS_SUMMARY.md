# Clockify API Integration - Quick Reference

## Current State Assessment

| Aspect             | Status   | Notes                                       |
| ------------------ | -------- | ------------------------------------------- |
| **Retry Logic**    | ⚠️ Basic | 2 retries, fixed delays, GET only           |
| **Rate Limiting**  | ❌ None  | No awareness of 50 req/sec limit            |
| **Pagination**     | ❌ None  | Assumes all results fit in one response     |
| **Concurrency**    | ⚠️ Risky | 3 parallel calls in `getWeeklyTimeReport()` |
| **Error Handling** | ✅ Good  | Proper HTTPError parsing                    |
| **Observability**  | ❌ None  | No logging or metrics                       |

---

## Critical Issues

### 1. **POST Requests Not Retried** 🔴

- Reports API uses POST but retry config only includes GET
- If Reports API fails, no automatic retry
- **Impact:** Data fetch failures for weekly reports

### 2. **No Rate Limit Awareness** 🔴

- Clockify limit: 50 req/sec
- No inspection of rate limit headers
- No proactive throttling
- **Impact:** Potential 429 errors under load

### 3. **Pagination Not Implemented** 🟡

- Clients/Projects endpoints support pagination
- Large workspaces (100+ items) get truncated
- **Impact:** Incomplete data for large accounts

### 4. **Concurrent Request Storm Risk** 🟡

- `getWeeklyTimeReport()` makes 3 parallel POST calls
- Multiple simultaneous calls could exceed rate limits
- **Impact:** Intermittent failures during peak usage

---

## Quick Wins (Easy Fixes)

### Fix 1: Enable POST Retries (5 min)

```typescript
// src/lib/clockify/api-instance.ts
retry: {
  limit: 3,
  methods: ["get", "post"],  // ← Add "post"
  statusCodes: [408, 413, 429, 500, 502, 503, 504],
}
```

### Fix 2: Exponential Backoff (15 min)

```typescript
function createRetryDelay(attemptNumber: number): number {
  const baseDelay = 100 * Math.pow(2, attemptNumber);
  const jitter = baseDelay * 0.5 * Math.random();
  return baseDelay + jitter;
}

retry: {
  limit: 3,
  methods: ["get", "post"],
  statusCodes: [408, 413, 429, 500, 502, 503, 504],
  delay: createRetryDelay,  // ← Use exponential backoff
}
```

### Fix 3: Error Classification (20 min)

```typescript
interface ErrorClassification {
  isRetryable: boolean;
  isRateLimit: boolean;
  isAuthError: boolean;
}

// Distinguish 429 (retryable) from 401 (not retryable)
```

---

## Medium Effort Improvements

### Improvement 1: Rate Limit Awareness (1-2 hours)

- Create `ClockifyRateLimiter` class
- Inspect `X-RateLimit-*` headers
- Wait before next request if approaching limit
- **Benefit:** Prevent 429 errors proactively

### Improvement 2: Request Queuing (1-2 hours)

- Create `RequestQueue` class
- Limit concurrent requests to 5
- Queue excess requests
- **Benefit:** Prevent concurrent request storms

### Improvement 3: Pagination Support (2-3 hours)

- Add `getAllClients()` function
- Add `getAllProjects()` function
- Handle page-size=500 pagination
- **Benefit:** Support large workspaces

---

## Implementation Priority

```
WEEK 1 (Foundation)
├─ Enable POST retries
├─ Add exponential backoff
└─ Add error classification

WEEK 2 (Resilience)
├─ Rate limit awareness
├─ Request queuing
└─ Observability/logging

WEEK 3 (Completeness)
├─ Pagination support
├─ Update tests
└─ Documentation

WEEK 4 (Validation)
├─ Load testing
├─ Integration tests
└─ Performance tuning
```

---

## Code Locations

| File                                       | Purpose            | Status               |
| ------------------------------------------ | ------------------ | -------------------- |
| `src/lib/clockify/api-instance.ts`         | HTTP client config | ⚠️ Needs retry fixes |
| `src/lib/clockify/reports-api-instance.ts` | Reports API config | ⚠️ Needs retry fixes |
| `src/lib/clockify/client.ts`               | API functions      | ⚠️ Needs pagination  |
| `src/lib/clockify/types.ts`                | Type definitions   | ✅ Good              |
| `src/server/clockifyServerFns.ts`          | Server functions   | ✅ Good              |

---

## Testing Strategy

### Unit Tests (New)

- Exponential backoff calculation
- Rate limiter state management
- Error classification logic
- Request queue concurrency

### Integration Tests (Existing)

- Pagination with real API
- Rate limit header handling
- Retry behavior under failures
- Concurrent request handling

### Load Tests (New)

- 10 concurrent `getWeeklyTimeReport()` calls
- Verify no 429 errors
- Measure queue depth
- Monitor latency

---

## Monitoring Checklist

After implementation, monitor:

- [ ] 429 error rate (should be 0)
- [ ] Request latency (P99 < 10s)
- [ ] Retry count distribution
- [ ] Queue depth (should be < 10)
- [ ] Rate limit remaining (should stay > 5)

---

## References

- **Clockify API Docs:** https://docs.clockify.me/
- **Rate Limiting:** https://docs.clockify.me/#section/Rate-limiting
- **Exponential Backoff:** https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- **ky HTTP Client:** https://github.com/sindresorhus/ky

---

## Next Steps

1. **Read full research:** `agent/summaries/clockify_api_research_2026_01_20.md`
2. **Create bean for Phase 1:** Exponential backoff + POST retries
3. **Implement fixes in order**
4. **Add tests for each improvement**
5. **Monitor production metrics**
