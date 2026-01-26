---
# time.bjesuiter.de-p7qq
title: Split clockify server layer into services
status: todo
type: task
created_at: 2026-01-26T14:50:01Z
updated_at: 2026-01-26T14:50:01Z
---

Reduce clockifyServerFns.ts complexity by separating API calls, cache persistence, and server-fn wiring into smaller modules.\n\n## Checklist\n- [ ] Introduce a clockify service module for API fetch + report building\n- [ ] Introduce a cache repo/module for cachedDaily/cachedWeekly operations\n- [ ] Keep server fns thin wrappers around service calls\n- [ ] Update imports/exports and ensure no route imports server-only modules