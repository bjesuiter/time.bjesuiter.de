# Implementation Decisions Summary

**Date**: 2025-10-31\
**Status**: ✅ All Pre-Implementation Questions Resolved

---

## Overview

This directory contains all architectural and implementation decisions made before
starting development. Each decision document provides context, rationale, alternatives
considered, and implementation details.

---

## Decision Documents

### 1. [EventSourcingDB vs SQLite](2025_10_31_eventsourcingdb_vs_sqlite.md)

**Summary**: Use SQLite with temporal tables instead of EventSourcingDB.

**Key Points**:
- Application doesn't generate domain events (data comes from Clockify)
- Temporal tables (Slowly Changing Dimension Type 2) solve versioning needs
- Simpler deployment and operation

---

### 2. [Better-Auth Integration](2025_10_31_better_auth_integration.md)

**Summary**: Use Better-auth for authentication with email/password.

**Key Points**:
- Better-auth manages its own schema (user, session, account, verification)
- Application data stored in separate tables
- Passwords automatically hashed
- Already configured and ready to use

---

### 3. [Clockify API Key Storage](2025_10_31_clockify_api_key_storage.md)

**Summary**: Store Clockify API keys in plain text (no encryption).

**Key Points**:
- Personal project - encryption complexity not justified
- Server-side only access (never exposed to client)
- Can add encryption later if needed
- Database file protected by filesystem permissions

**Decided**: Simplified approach for personal use case.

---

### 4. [Timezone and Week Boundaries](2025_10_31_timezone_and_week_boundaries.md)

**Summary**: Use timezone and week start settings from Clockify user profile.

**Key Points**:
- Fetch `timeZone` and `weekStart` from Clockify `/v1/user` endpoint
- Store in `user_clockify_config` table
- Manual refresh button to update if user changes Clockify settings
- Consistent with what user sees in Clockify

**Decided**: Zero user configuration, respects existing Clockify preferences.

---

### 5. [Cumulative Overtime Tracking](2025_10_31_cumulative_overtime_tracking.md)

**Summary**: User-defined start date, daily-based calculation, no reset mechanism.

**Key Points**:
- User sets `cumulativeOvertimeStartDate` (e.g., 2025-10-01)
- Starts at 0 hours
- Daily-based calculation:
  - Expected hours per day = `regularHoursPerWeek / workingDaysPerWeek`
  - Weekends have 0h expected
  - Weekend work adds to actual hours
- No automatic reset (tracks indefinitely)

**Configuration**:
- `regularHoursPerWeek`: e.g., 25 or 40
- `workingDaysPerWeek`: e.g., 5 (Mon-Fri)
- `cumulativeOvertimeStartDate`: e.g., "2025-10-01"

**Decided**: Daily granularity for accurate tracking, flexible configuration.

---

### 6. [Cache Invalidation and Week Commitment](2025_10_31_cache_invalidation_and_week_commitment.md)

**Summary**: Week commitment system with status-based refresh logic.

**Key Points**:
- Each week has status: **Pending** or **Committed**
- Pending weeks: Auto-refresh on page load
- Committed weeks: Never auto-refresh (manual only)
- Discrepancy tracking when committed weeks change
- Settings: "Refresh from January 1st" button

**Week Actions**:
- Commit week: Lock data (reported to work systems)
- Per-week "Refetch & Recalculate" button
- Uncommit week: Allow auto-refresh again

**Decided**: Protects committed data, prevents nasty surprises after reporting.

---

### 7. [Client Filter and Tracked Projects](2025_10_31_client_filter_and_tracked_projects.md)

**Summary**: Single client filter with multiple tracked projects (versioned).

**Key Points**:
- **Client**: Single, stored in `user_clockify_config` (not versioned)
- **Tracked Projects**: Multiple, stored in `config_chronic` (versioned)
- Weekly total includes ALL client projects (tracked + untracked)
- Tracked projects shown in detail, untracked shown as "Extra Work"

**Storage**:
- `user_clockify_config.selectedClientId`
- `user_clockify_config.selectedClientName`
- `config_chronic.tracked_projects` (versioned config)

**Decided**: Single-client model matches personal use case, tracked projects versioned
for historical accuracy.

---

### 8. [Weekly Table Layout](2025_10_31_weekly_table_layout.md)

**Summary**: Multi-row weekly table with tracked projects, extra work, and total rows.

**Key Points**:
- One row per tracked project (detailed breakdown)
- One "Extra Work" row (sum of untracked projects)
- One "Total" row (all client work, used for overtime)
- Transparency: User sees exactly where time went

**Example**:
```
SMC 1.9:        19h
Internal Time:   6h
Extra Work:      2h (Administration, Recruiting)
──────────────────
Total:          27h (Expected: 25h)
Overtime:       +2h
```

**Decided**: Multi-row layout provides full transparency for overtime calculation.

---

### 9. [Initial Data Fetch Scope](2025_10_31_initial_data_fetch_scope.md)

**Summary**: Display current month plus the week before the month starts.

**Key Points**:
- Default view: Current calendar month + previous week
- Month-based navigation (Previous/Next month buttons)
- Approximately 5-6 weeks displayed
- Fast page loads, clear boundaries

**Example** (Oct 31, 2025):
```
Week Sep 22-28   (week before Oct 1)
Week Sep 29-Oct 5 (contains Oct 1)
Week Oct 6-12
Week Oct 13-19
Week Oct 20-26
Week Oct 27-Nov 2 (current week)
```

**Decided**: Month-based view aligns with mental model and work reporting cycles.

---

## Implementation Readiness

### ✅ All Pre-Implementation Questions Resolved

1. ✅ **API Key Storage** - Plain text (simplified)
2. ✅ **Timezone & Week Boundaries** - From Clockify settings
3. ✅ **Cumulative Overtime** - User-defined start date, daily calculation
4. ✅ **Cache Invalidation** - Week commitment system
5. ✅ **Client Filter** - Single client, multiple tracked projects
6. ✅ **Initial Data Scope** - Current month + previous week

### Database Schema Ready

All table schemas finalized:
- ✅ `user_clockify_config` (updated with all fields)
- ✅ `config_chronic` (tracked projects only)
- ✅ `cached_daily_project_sums` (per-project granularity)
- ✅ `cached_weekly_sums` (with status and commitment)
- ✅ `weekly_discrepancies` (new table for change tracking)

### Next Steps

Ready to proceed with implementation following the phase plan in
[ARCHITECTURE.md](../ARCHITECTURE.md):

1. **Phase 1**: Build user registration/login UI and Clockify setup wizard
2. **Phase 2**: Implement Clockify API client and multi-row weekly table
3. **Phase 3**: Configuration management and versioning
4. **Phase 4**: Caching layer and week commitment system
5. **Phase 5**: Polish and features

---

## Key Technical Decisions

### Architecture Pattern
- **Temporal Tables** for configuration versioning
- **Status-Based Caching** for week commitment
- **Daily Granularity** for accurate overtime calculation

### Data Model
- **User settings** in `user_clockify_config` (rarely change)
- **Versioned config** in `config_chronic` (tracked projects)
- **Per-project daily sums** for flexible breakdown
- **Weekly sums with status** for commitment tracking

### User Experience
- **Transparent calculations** via multi-row breakdown
- **Data protection** via week commitment
- **Zero configuration** by using Clockify settings
- **Month-based navigation** for intuitive browsing

---

## Decision Document Format

Each decision document follows this structure:

1. **Problem** - What needs to be decided and why
2. **Decision** - What was decided (clear statement)
3. **Implementation Details** - Schemas, logic, code examples
4. **Rationale** - Why this decision was made
5. **User Flow** - How users interact with the feature
6. **Examples** - Concrete scenarios and calculations
7. **Alternatives Considered** - Other options and why rejected
8. **Consequences** - Positive, negative, and neutral impacts
9. **Future Enhancements** - Out of scope ideas
10. **Testing Considerations** - Test cases needed
11. **References** - Related documents and resources

---

## References

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Overall system architecture
- [README.md](../README.md) - Agent guidelines and workflow

---

_All pre-implementation decisions complete. Ready for development!_

