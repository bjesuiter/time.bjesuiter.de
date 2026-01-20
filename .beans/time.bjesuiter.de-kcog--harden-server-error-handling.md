---
# time.bjesuiter.de-kcog
title: Harden server error handling
status: todo
type: task
created_at: 2026-01-20T22:31:02Z
updated_at: 2026-01-20T22:31:02Z
---

## Summary
Add try/catch around DB ops and JSON parsing in server functions/helpers.

## Checklist
- [ ] Wrap `cacheHelpers` DB updates with try/catch
- [ ] Ensure cache/config helpers throw Response on failure
- [ ] Add safe JSON parsing for tracked project config
- [ ] Standardize error responses in user/server fns