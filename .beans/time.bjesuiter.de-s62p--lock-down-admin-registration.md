---
# time.bjesuiter.de-s62p
title: Lock down admin registration
status: todo
type: bug
created_at: 2026-01-20T22:30:10Z
updated_at: 2026-01-20T22:30:10Z
---

## Summary
Restrict admin registration to authenticated or setup-only flow to prevent account takeover.

## Checklist
- [ ] Add auth/role guard to registerAdminUser or restrict to initial setup
- [ ] Protect `/registerAdmin` route from unauthenticated access
- [ ] Remove/limit `force` parameter behavior
- [ ] Add tests or manual verification for access control