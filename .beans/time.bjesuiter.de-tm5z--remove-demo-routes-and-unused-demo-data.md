---
# time.bjesuiter.de-tm5z
title: Remove demo routes and unused demo data
status: todo
type: task
created_at: 2026-01-20T22:31:02Z
updated_at: 2026-01-20T22:31:02Z
---

## Summary
Delete demo routes/data and remove demo navigation links to reduce attack surface and maintenance.

## Checklist
- [ ] Remove `src/routes/demo/*` routes and API endpoints
- [ ] Remove `src/data/demo.punk-songs.ts` and demo-only types
- [ ] Remove demo links from `src/components/Header.tsx`
- [ ] Regenerate route tree if needed