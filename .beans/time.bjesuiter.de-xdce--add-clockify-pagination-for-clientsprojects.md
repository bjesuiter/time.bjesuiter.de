---
# time.bjesuiter.de-xdce
title: Add Clockify pagination for clients/projects
status: todo
type: task
created_at: 2026-01-20T22:30:11Z
updated_at: 2026-01-20T22:30:11Z
---

## Summary

Implement pagination for Clockify list endpoints to avoid truncated results.

## Checklist

- [ ] Add paginated fetch helpers for clients and projects
- [ ] Use page-size max and loop until empty
- [ ] Add unit/integration coverage for pagination
- [ ] Update callers to use paginated versions
