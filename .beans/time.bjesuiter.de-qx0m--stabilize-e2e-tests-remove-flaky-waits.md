---
# time.bjesuiter.de-qx0m
title: Stabilize E2E tests (remove flaky waits)
status: todo
type: task
created_at: 2026-01-20T22:29:01Z
updated_at: 2026-01-20T22:29:01Z
---

## Summary

Replace `networkidle` waits, `Promise.race`, and `.isVisible().catch(() => false)` with deterministic Playwright waits.

## Checklist

- [ ] Replace `page.waitForLoadState("networkidle")` with targeted waits
- [ ] Remove `Promise.race` visibility patterns in auth tests
- [ ] Replace `.isVisible().catch(() => false)` with explicit assertions
- [ ] Re-run E2E suite for flakiness check
