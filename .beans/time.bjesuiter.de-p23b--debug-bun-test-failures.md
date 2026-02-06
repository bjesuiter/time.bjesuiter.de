---
# time.bjesuiter.de-p23b
title: Debug bun test failures
status: in-progress
type: task
priority: normal
tags:
    - blocked
created_at: 2026-01-26T15:23:47Z
updated_at: 2026-01-26T21:02:04Z
---

\nInvestigate bun test failures, identify root cause(s), and propose fixes or steps to resolve.\n\n## Findings\n- Unit tests pass.\n- Integration Clockify tests time out at default 5s; even 30s still time out and show auth errors.\n- Likely causes: API key/workspace env, rate limiting, or network constraints.\n\n## Actions Taken\n- Added Clockify HTTP request/response/error logging gated by CLOCKIFY_DEBUG.\n- Added a global Clockify request rate limiter to reduce 429s.\n- Created follow-up beans for TypeScript errors and integration test timeouts.\n\n## Blocked\n- Verification blocked by existing TypeScript errors and failing Clockify integration tests.\n\n