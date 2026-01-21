---
# time.bjesuiter.de-84p4
title: Fix server-only import in auth API route
status: completed
type: bug
priority: normal
created_at: 2026-01-20T22:29:01Z
updated_at: 2026-01-21T22:21:39Z
---

## Summary
Move auth handler into a server function so routes stay client-safe.

## Problem
`src/routes/api/auth/$.ts` imports `@/lib/auth/auth` directly, violating the project's server-only code pattern. Route files are bundled for both client and server - server-only modules should only be imported in `src/server/` files.

## Current (Wrong)
```typescript
// src/routes/api/auth/$.ts
import { auth } from "@/lib/auth/auth";  // ❌ Server-only in route file
```

## Expected (Correct)
```typescript
// src/server/authServerFns.ts
import { auth } from "@/lib/auth/auth";  // ✅ Server-only in server file
export const handleAuthRequest = createServerFn(...).handler(...)

// src/routes/api/auth/$.ts
import { handleAuthRequest } from "@/server/authServerFns";  // ✅ Safe
```

## Checklist
- [x] Create `src/server/authServerFns.ts` with wrapper for Better Auth handler
- [x] Update `src/routes/api/auth/$.ts` to call server function
- [x] Verify no server-only imports remain in route files (`grep -r "from \"@/lib/auth" src/routes/`)
- [x] Test auth flow still works (signin, signup, signout)