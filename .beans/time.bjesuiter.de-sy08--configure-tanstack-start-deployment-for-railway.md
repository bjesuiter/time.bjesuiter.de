---
# time.bjesuiter.de-sy08
title: Configure TanStack Start deployment for Railway
status: completed
type: task
priority: normal
created_at: 2026-01-19T22:30:48Z
updated_at: 2026-01-20T17:36:37Z
---

## Goal

Deploy the TanStack Start application to Railway with Bun as the runtime.

## Requirements

1. Bun must be available as the runtime on Railway
2. Build TanStack Start application using Bun
3. Ensure proper start command for production

## Completed

- [x] Added nitro plugin with `preset: 'bun'` to vite.base.ts
- [x] Created railway.json with Nixpacks builder and bun start command
- [x] Added `start` script to package.json: `bun .output/server/index.mjs`
- [x] Build outputs to `.output/` directory with nitro
- [x] Verified server starts correctly locally

## Notes

- Environment variables will need to be configured in Railway dashboard
- Actual deployment testing requires Railway account access