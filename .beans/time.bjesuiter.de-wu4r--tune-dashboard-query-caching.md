---
# time.bjesuiter.de-wu4r
title: Tune dashboard query caching
status: in-progress
type: task
priority: normal
tags:
    - blocked
created_at: 2026-01-26T14:59:10Z
updated_at: 2026-01-26T15:43:07Z
---

Reduce unnecessary refetching on the dashboard by tuning React Query settings for setup/config data.\n\n## Checklist\n- [x] Set staleTime/refetchOnWindowFocus for setup/config queries\n- [x] Ensure refresh button still forces refetch as intended\n- [x] Review query keys to avoid redundant fetches per week/month\n- [x] Add brief comment/doc to explain caching policy

## Verification
- Build: `bun run build` (ok)
- Typecheck: `bunx tsc --noEmit` (failed due to existing TS errors)
- Unit tests: `bun test tests/unit` (ok)
- Integration tests: `bun test --timeout 30000 tests/integration` (timeouts + auth errors)

## Blocked
- Blocked by existing TypeScript errors and failing Clockify integration tests. Follow-up beans created.
