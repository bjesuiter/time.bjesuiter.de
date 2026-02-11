---
# time.bjesuiter.de-wf2u
title: Fix TZDate.toISOString() producing invalid format for Clockify API
status: completed
type: bug
priority: normal
created_at: 2026-01-20T19:44:07Z
updated_at: 2026-01-20T19:54:08Z
---

## Problem

TZDate.toISOString() returns timezone offset format (e.g., '2026-01-19T00:00:00.000+01:00') instead of UTC format ('2026-01-18T23:00:00.000Z') that Clockify API expects.

This causes 'Invalid date! dateRangeStart and dateRangeEnd must be in ISO date format' error when fetching weekly time data.

## Root Cause

In clockifyServerFns.ts, getWeeklyTimeSummary() and getCumulativeOvertime() call .toISOString() directly on TZDate objects (returned by parseLocalDateInTz).

## Solution

Convert TZDate to regular Date before calling toISOString():

- new Date(tzDate.getTime()).toISOString()

Or add a utility function toUTCISOString() in date-utils.ts.

## Affected Files

- src/server/clockifyServerFns.ts - lines calling .toISOString() on TZDate objects

## Checklist

- [x] Add toUTCISOString() utility function to date-utils.ts
- [x] Update clockifyServerFns.ts to use new utility function
- [x] Run unit tests to verify fix
- [x] Manual verification on dashboard
