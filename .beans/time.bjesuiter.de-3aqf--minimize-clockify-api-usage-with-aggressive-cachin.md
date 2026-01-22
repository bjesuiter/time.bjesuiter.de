---
# time.bjesuiter.de-3aqf
title: Minimize Clockify API usage with aggressive caching
status: completed
type: task
priority: high
created_at: 2026-01-22T12:10:55Z
updated_at: 2026-01-22T12:37:28Z
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

## Implementation

### Caching Strategy
1. **Cache-first**: Always check cache before considering API call
2. **Explicit refresh only**: API calls require `forceRefresh=true` flag
3. **No cache = error**: If no cache exists and forceRefresh is false, return error instead of auto-fetching

### API Call Sites
- `validateApiKey` - Setup validation (OK)
- `getUserInfo` - Setup/settings (OK)
- `getWorkspaces/getClients/getProjects` - Setup flow (OK)
- `getWeeklyTimeReport` - Now requires explicit forceRefresh

### Changes Made
- `getCachedWeeklySummary`: Returns error if no cache and forceRefresh=false
- `getWeeklyTimeSummary`: Returns error if no cache and forceRefresh=false

## Checklist
- [x] Audit all Clockify API call sites
- [x] Ensure getCachedWeeklySummary uses cache by default
- [x] Remove any auto-refresh logic that calls Clockify API
- [x] Document the caching strategy