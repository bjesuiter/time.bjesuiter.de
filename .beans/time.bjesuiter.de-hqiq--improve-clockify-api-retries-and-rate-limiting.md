---
# time.bjesuiter.de-hqiq
title: Improve Clockify API retries and rate limiting
status: todo
type: task
created_at: 2026-01-20T22:30:11Z
updated_at: 2026-01-20T22:30:11Z
---

## Summary
Add POST retries, exponential backoff, and rate-limit awareness for Clockify API calls.

## Checklist
- [ ] Enable POST retries in `api-instance.ts`
- [ ] Add exponential backoff + jitter to retry strategy
- [ ] Inspect rate-limit headers and throttle when low
- [ ] Add logging/metrics for 429 responses