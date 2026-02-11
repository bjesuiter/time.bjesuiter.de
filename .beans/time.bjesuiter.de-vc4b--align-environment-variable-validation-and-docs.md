---
# time.bjesuiter.de-vc4b
title: Align environment variable validation and docs
status: completed
type: task
priority: normal
created_at: 2026-01-20T22:30:10Z
updated_at: 2026-01-21T22:44:09Z
---

## Summary

Bring envStore, AGENTS.md, and .env.example into sync (ENVIRONMENT, Better Auth, VITE, test vars).

## Checklist

- [x] Add missing env vars to `src/lib/env/envStore.ts` (ENVIRONMENT already exists)
- [x] Update `AGENTS.md` env var section with descriptions
- [x] Update `.env.example` to include ENVIRONMENT
- [x] Document test-only env vars in test README (already documented, added reference)
