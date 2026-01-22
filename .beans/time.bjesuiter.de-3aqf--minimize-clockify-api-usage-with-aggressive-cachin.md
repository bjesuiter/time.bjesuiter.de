---
# time.bjesuiter.de-3aqf
title: Minimize Clockify API usage with aggressive caching
status: todo
type: task
priority: high
created_at: 2026-01-22T12:10:55Z
updated_at: 2026-01-22T12:10:55Z
parent: uvmr
---

Ensure Clockify API is only called when absolutely necessary.

## Current Behavior
- API may be called multiple times for the same data
- Unclear when cache is used vs fresh fetch

## Target Behavior
- Once weekly data is fetched and cached, NEVER refetch automatically
- Only refetch when user explicitly clicks refresh icon on:
  - Week view refresh button
  - Settings > Configuration Chronicle refresh button
- Cache should be the source of truth for all calculations

## Checklist
- [ ] Audit all Clockify API call sites
- [ ] Ensure getCachedWeeklySummary uses cache by default
- [ ] Remove any auto-refresh logic that calls Clockify API
- [ ] Document the caching strategy