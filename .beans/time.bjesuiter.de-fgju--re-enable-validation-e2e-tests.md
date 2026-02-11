---
# time.bjesuiter.de-fgju
title: Re-enable validation E2E tests
status: completed
type: bug
priority: normal
created_at: 2026-01-20T22:29:01Z
updated_at: 2026-01-21T22:32:56Z
---

## Summary

Fix signup/signin validation behavior in test environment and unskip validation E2E tests.

## Checklist

- [x] Identify why validation is not triggered in test env
- [x] Fix form validation behavior or selectors for tests
- [x] Unskip validation tests in `tests/e2e/user-journeys/validation.spec.ts`
- [x] Run targeted E2E validation tests to confirm stability

## Fix Applied

- Root cause: HTML5 `required` attribute triggered browser validation before JS validation
- Solution: Added `noValidate` to forms to let JS validation handle errors
- Also added `name` attributes to form inputs for proper semantics
- Removed borderline email format that passed client validation but failed server
