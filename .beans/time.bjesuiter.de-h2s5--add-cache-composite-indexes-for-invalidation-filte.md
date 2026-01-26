---
# time.bjesuiter.de-h2s5
title: Add cache composite indexes for invalidation filters
status: todo
type: task
created_at: 2026-01-26T14:58:49Z
updated_at: 2026-01-26T14:58:49Z
---

Speed up cache reads by adding composite indexes that match common filters (user_id + date/week + invalidated_at).\n\n## Checklist\n- [ ] Review hottest cache queries in server fns for date/week + invalidated_at filters\n- [ ] Add composite indexes to cached_daily_project_sums and cached_weekly_sums\n- [ ] Validate migrations/regeneration for SQLite via Drizzle\n- [ ] Confirm query plans improve (if tooling available)