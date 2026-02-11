---
# time.bjesuiter.de-rg0f
title: Add dashboard bootstrap server fn
status: todo
type: task
created_at: 2026-01-26T14:57:03Z
updated_at: 2026-01-26T14:57:03Z
---

Reduce client round-trips by introducing a single server fn that returns setup/config/week data for the dashboard.\n\n## Checklist\n- [ ] Define a server fn that returns setup status, config, week summary, cumulative overtime, and boundaries as needed\n- [ ] Update the dashboard route to call the bootstrap fn (remove sequential queries)\n- [ ] Ensure query keys and invalidation still work for refresh actions\n- [ ] Confirm fallback behavior when setup is incomplete
