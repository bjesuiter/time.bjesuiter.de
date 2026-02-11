---
# time.bjesuiter.de-aees
title: Replace any types in settings and setup routes
status: completed
type: task
priority: normal
created_at: 2026-01-20T22:31:02Z
updated_at: 2026-01-21T21:38:20Z
---

## Summary

Remove `any` usage in settings and tracked-projects routes for strict typing.

## Checklist

- [ ] Replace `entry: any` in `src/routes/settings.tsx` with concrete type
- [ ] Replace `error: any` in `src/routes/setup/tracked-projects.tsx` with proper error type
- [ ] Ensure type imports align with config schema types
