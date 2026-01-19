---
# time.bjesuiter.de-xqzj
title: Error handling & retry logic
status: completed
type: task
priority: normal
created_at: 2026-01-19T18:52:45Z
updated_at: 2026-01-19T20:07:29Z
parent: time.bjesuiter.de-lbhw
---

Improve robustness of API calls and data operations.

## Requirements
- Retry failed Clockify API calls (with backoff)
- User-friendly error messages
- Offline handling (show cached data if available)
- Toast notifications for transient errors

## Checklist
- [x] Configure TanStack Query default retry options
- [x] Add error boundaries for React components
- [x] Improve error messages to be user-friendly
- [x] Add retry button for failed queries

## Implementation
- Configured QueryClient with retry (3 attempts), exponential backoff, 5min staleTime
- Created ErrorBoundary component wrapping entire app
- Created QueryErrorMessage component with retry button
- Dashboard now shows retry option on query failures
- Differentiates between setup issues and actual errors

## Patterns Used
- TanStack Query retry options with exponential backoff
- Error boundaries for React components
- Graceful degradation with retry UI

## Context
Part of Phase 5 - Polish & Features
