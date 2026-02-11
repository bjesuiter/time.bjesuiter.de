---
# time.bjesuiter.de-b7l8
title: Remove secrets from repo and rotate keys
status: scrapped
type: bug
priority: normal
created_at: 2026-01-20T22:30:10Z
updated_at: 2026-01-21T22:17:54Z
---

## Summary

Remove committed `.env` secrets and rotate Better Auth/Clockify credentials.

## Checklist

- [ ] Ensure `.env` is gitignored and removed from repo history
- [ ] Rotate BETTER_AUTH_SECRET and Clockify test keys
- [ ] Verify local/dev uses `.env.local` or secure store
- [ ] Add guidance for secret handling in docs
