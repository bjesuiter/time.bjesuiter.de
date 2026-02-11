---
# time.bjesuiter.de-mhb8
title: Add notFoundComponent to router configuration
status: completed
type: task
priority: low
created_at: 2026-01-20T22:13:25Z
updated_at: 2026-01-21T22:38:12Z
---

TanStack Router warning appears in console:

```
Warning: A notFoundError was encountered on the route with ID "__root__", but a notFoundComponent option was not configured, nor was a router level defaultNotFoundComponent configured.
```

## Fix

Configure either:

- A `notFoundComponent` on the root route, OR
- A `defaultNotFoundComponent` at the router level

## Checklist

- [x] Create a custom NotFound component
- [x] Configure it in the router or root route
- [x] Verify warning is gone (build passes)
