---
# time.bjesuiter.de-eha1
title: Extract shared server auth helper
status: todo
type: task
created_at: 2026-01-26T13:30:05Z
updated_at: 2026-01-26T13:30:05Z
---

Create a reusable server-only auth helper to eliminate duplicated getAuthenticatedUserId logic across server fns.\n\n## Checklist\n- [ ] Add a shared helper in src/server (e.g., authHelpers.ts) that returns userId or throws 401\n- [ ] Update server fns to use the shared helper (clockify/config/user as applicable)\n- [ ] Ensure error handling stays consistent with current behavior\n- [ ] Verify no server-only imports leak into routes