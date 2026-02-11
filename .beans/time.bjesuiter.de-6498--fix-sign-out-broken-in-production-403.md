---
# time.bjesuiter.de-6498
title: Fix sign-out broken in production (403)
status: completed
type: bug
priority: normal
created_at: 2026-01-20T21:24:05Z
updated_at: 2026-01-20T21:29:54Z
---

Sign-out returns 403 Forbidden in production because time.bjesuiter.de is not in the trustedOrigins list.

## Root Cause

In `src/lib/auth/auth.ts`, the `trustedOrigins` array only includes localhost:

```typescript
trustedOrigins: ["http://localhost:3000", "http://localhost:3001"],
```

## Fix

Add the production domain to trustedOrigins:

```typescript
trustedOrigins: [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://time.bjesuiter.de"
],
```

## Checklist

- [x] Add production domain to trustedOrigins
- [x] Deploy and verify sign-out works in prod
