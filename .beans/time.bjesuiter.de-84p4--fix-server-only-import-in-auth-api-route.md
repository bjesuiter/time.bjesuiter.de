---
# time.bjesuiter.de-84p4
title: Fix server-only import in auth API route
status: todo
type: bug
created_at: 2026-01-20T22:29:01Z
updated_at: 2026-01-20T22:29:01Z
---

## Summary
Move auth handler into a server function so routes stay client-safe.

## Checklist
- [ ] Add server function wrapper for Better Auth handler in `src/server`
- [ ] Update `src/routes/api/auth/$.ts` to call server function
- [ ] Verify no server-only imports remain in routes
- [ ] Confirm GET/POST handlers still work