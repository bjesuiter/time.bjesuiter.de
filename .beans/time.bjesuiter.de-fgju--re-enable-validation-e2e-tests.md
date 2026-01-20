---
# time.bjesuiter.de-fgju
title: Re-enable validation E2E tests
status: todo
type: bug
created_at: 2026-01-20T22:29:01Z
updated_at: 2026-01-20T22:29:01Z
---

## Summary
Fix signup/signin validation behavior in test environment and unskip validation E2E tests.

## Checklist
- [ ] Identify why validation is not triggered in test env
- [ ] Fix form validation behavior or selectors for tests
- [ ] Unskip validation tests in `tests/e2e/user-journeys/validation.spec.ts`
- [ ] Run targeted E2E validation tests to confirm stability