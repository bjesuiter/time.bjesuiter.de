---
# time.bjesuiter.de-8mnf
title: Rate limit Clockify API requests
status: in-progress
type: task
priority: normal
tags:
    - blocked
created_at: 2026-01-26T15:38:03Z
updated_at: 2026-01-26T15:41:51Z
---

Add request-level rate limiting for Clockify API calls to reduce 429s during integration tests and runtime usage.

## Implementation
- Added a global Clockify request limiter with a minimum spacing between requests.
- Default spacing is 350ms, configurable via `CLOCKIFY_RATE_LIMIT_MS`.

## Verification
- Build: `bun run build` (ok)
- Typecheck: `bunx tsc --noEmit` (failed due to existing TS errors)
- Unit tests: `bun test tests/unit` (ok)
- Integration tests: `bun test --timeout 30000 tests/integration` (timeouts + auth errors)

## Blocked
- Blocked by existing TypeScript errors and failing Clockify integration tests. Follow-up beans created.
