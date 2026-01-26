---
# time.bjesuiter.de-p23b
title: Debug bun test failures
status: in-progress
type: task
priority: normal
tags:
    - blocked
created_at: 2026-01-26T15:23:47Z
updated_at: 2026-01-26T15:44:04Z
---

Investigate bun test failures, identify root cause(s), and propose fixes or steps to resolve.

## Findings
- Unit tests pass.
- Integration Clockify tests time out at default 5s; even 30s still time out and show auth errors.
- Likely causes: API key/workspace env, rate limiting, or network constraints.

## Actions Taken
- Added a global Clockify request rate limiter to reduce 429s.
- Created follow-up beans for TypeScript errors and integration test timeouts.

## Blocked
- Verification blocked by existing TypeScript errors and failing Clockify integration tests.
