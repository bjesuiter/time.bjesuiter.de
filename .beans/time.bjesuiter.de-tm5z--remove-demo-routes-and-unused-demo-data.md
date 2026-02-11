---
# time.bjesuiter.de-tm5z
title: Remove demo routes and unused demo data
status: completed
type: task
priority: normal
created_at: 2026-01-20T22:31:02Z
updated_at: 2026-01-21T22:36:29Z
---

## Summary

Delete demo routes/data and remove demo navigation links to reduce attack surface and maintenance.

## Checklist

- [x] Remove `src/routes/demo/*` routes and API endpoints
- [x] Remove `src/data/demo.punk-songs.ts` and demo-only types
- [x] Remove demo links from `src/components/Header.tsx`
- [x] Regenerate route tree if needed (verified via build)
