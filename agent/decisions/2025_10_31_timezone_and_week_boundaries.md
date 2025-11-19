# Decision: Timezone and Week Boundaries

**Date**: 2025-10-31  
**Status**: ✅ Decided  
**Context**: Phase 1 - Foundation & Authentication

---

## Problem

The application needs to determine:

1. **Which timezone** to use for calculating week boundaries and date ranges
2. **Which day** weeks should start on (Monday, Sunday, etc.)
3. **How to handle** Clockify API date/time parameters consistently

These decisions affect:

- How weekly summaries are grouped
- When "Monday" actually starts (midnight in which timezone?)
- Date range queries sent to Clockify API
- User experience consistency between this app and Clockify

---

## Decision

**Use timezone and week start settings from Clockify user profile.**

### Implementation Details

1. **Fetch settings from Clockify `/v1/user` endpoint:**

   ```json
   {
     "settings": {
       "timeZone": "Europe/Berlin", // IANA timezone
       "weekStart": "MONDAY" // "MONDAY" | "SUNDAY"
     }
   }
   ```

2. **Store in `user_clockify_config` table:**

   ```typescript
   {
     userId: string;
     clockifyApiKey: string;
     clockifyWorkspaceId: string;
     clockifyUserId: string;
     timeZone: string; // e.g., "Europe/Berlin"
     weekStart: string; // e.g., "MONDAY"
     createdAt: timestamp;
     updatedAt: timestamp;
   }
   ```

3. **When to fetch/update:**
   - ✅ During initial Clockify setup wizard
   - ✅ Manual refresh button in settings UI
   - ❌ NOT automatic polling (respects user control)

4. **Use for:**
   - Calculating week start/end dates
   - Converting dates to Clockify API ISO timestamps
   - Displaying dates in the UI
   - Determining "current week"

---

## Rationale

### Why Use Clockify Settings?

1. **Zero Configuration**: User already configured timezone in Clockify
2. **Consistency**: Week boundaries match what user sees in Clockify
3. **User Intent**: Respects their existing time tracking preferences
4. **No Guesswork**: Explicit timezone instead of browser auto-detection
5. **Reliability**: Same timezone regardless of where user accesses the app

### Why Manual Refresh Instead of Auto-Polling?

1. **Rare Changes**: Users rarely change timezone or week start settings
2. **API Efficiency**: Reduces unnecessary Clockify API calls
3. **User Control**: User explicitly triggers refresh when they change Clockify settings
4. **Predictability**: No surprise data changes from background updates

---

## Examples

### Example 1: Week Boundary Calculation

User settings: `timeZone: "Europe/Berlin"`, `weekStart: "MONDAY"`

**Current date:** 2025-10-31 (Friday)

**Calculated week boundaries:**

- Week start: Monday, 2025-10-27 at 00:00:00 Europe/Berlin
- Week end: Sunday, 2025-11-02 at 23:59:59 Europe/Berlin

**Sent to Clockify API:**

```json
{
  "dateRangeStart": "2025-10-26T22:00:00.000Z", // 00:00:00 Berlin = 22:00:00 UTC
  "dateRangeEnd": "2025-11-02T22:59:59.999Z" // 23:59:59 Berlin = 22:59:59 UTC
}
```

### Example 2: Week Start on Sunday

User settings: `timeZone: "America/New_York"`, `weekStart: "SUNDAY"`

**Current date:** 2025-10-31 (Friday)

**Calculated week boundaries:**

- Week start: Sunday, 2025-10-26 at 00:00:00 America/New_York
- Week end: Saturday, 2025-11-01 at 23:59:59 America/New_York

---

## User Flow

### Initial Setup

1. User enters Clockify API key
2. App calls `/v1/user` endpoint
3. Extracts `settings.timeZone` and `settings.weekStart`
4. Stores in `user_clockify_config`
5. Shows confirmation: "Using timezone: Europe/Berlin, Week starts: Monday"

### Settings Refresh

1. User navigates to Settings page
2. Sees current stored values:
   - Timezone: Europe/Berlin
   - Week starts: Monday
3. Clicks "Refresh from Clockify" button
4. App fetches latest settings from `/v1/user`
5. Updates `user_clockify_config`
6. Shows notification: "Settings updated"

---

## Alternatives Considered

### Option 1: Auto-Detect from Browser (Rejected)

```javascript
Intl.DateTimeFormat().resolvedOptions().timeZone;
```

**Pros:**

- No configuration needed
- Works immediately

**Cons:**

- ❌ Inconsistent if user accesses from multiple locations
- ❌ Browser timezone might differ from Clockify workspace timezone
- ❌ No way to get week start preference

### Option 2: Use UTC for Everything (Rejected)

**Pros:**

- Simple server logic
- No timezone conversion bugs

**Cons:**

- ❌ Week boundaries feel "wrong" (Monday starts mid-day)
- ❌ Confusing for user (mismatches Clockify)
- ❌ Poor UX for daily viewing

### Option 3: Manual Timezone Configuration (Rejected)

**Pros:**

- Full user control
- Can override Clockify if desired

**Cons:**

- ❌ Redundant with Clockify settings
- ❌ Extra setup step
- ❌ Can get out of sync with Clockify
- ❌ User must know their IANA timezone string

### Option 4: Auto-Poll Clockify Settings (Rejected)

**Pros:**

- Always up-to-date
- No manual refresh needed

**Cons:**

- ❌ Unnecessary API calls
- ❌ Increases Clockify API usage
- ❌ Could cause unexpected data changes
- ❌ Settings rarely change anyway

---

## Implementation Notes

### Timezone Handling Library

Use standard JavaScript/TypeScript date libraries that support IANA timezones:

**Recommended:** `date-fns-tz` or built-in `Intl` API

```typescript
import { formatInTimeZone, zonedTimeToUtc } from "date-fns-tz";

// Convert user's local "Monday 00:00:00" to UTC for API
const localMonday = new Date(2025, 9, 27, 0, 0, 0); // Oct 27, 2025
const utcTimestamp = zonedTimeToUtc(localMonday, "Europe/Berlin");
// Result: 2025-10-26T22:00:00.000Z
```

### Week Start Enum

```typescript
type WeekStart = "MONDAY" | "SUNDAY" | "SATURDAY";

function getWeekBoundaries(
  currentDate: Date,
  weekStart: WeekStart,
  timezone: string,
): { start: Date; end: Date } {
  // Implementation uses date-fns or similar
}
```

---

## Consequences

### Positive

- ✅ Zero user configuration
- ✅ Consistent with Clockify behavior
- ✅ Respects user's existing preferences
- ✅ Works correctly regardless of access location
- ✅ Explicit and predictable

### Negative

- ⚠️ User must manually refresh if they change Clockify settings
- ⚠️ Requires additional API call during setup
- ⚠️ Need to handle timezone conversion correctly (potential for bugs)

### Neutral

- 🔵 Adds two columns to `user_clockify_config` table
- 🔵 Need timezone library dependency (`date-fns-tz` or similar)
- 🔵 Settings UI needs "Refresh from Clockify" button

---

## Testing Considerations

Test cases needed:

1. ✅ Week boundaries in different timezones (UTC, UTC+X, UTC-X)
2. ✅ Week boundaries during DST transitions
3. ✅ Week starting on Monday vs. Sunday
4. ✅ Date range conversion to UTC for API calls
5. ✅ Edge case: User changes Clockify settings mid-week
6. ✅ Edge case: Invalid/unsupported timezone handling

---

## Future Enhancements (Out of Scope)

- Allow timezone override (use different timezone than Clockify)
- Auto-detect when Clockify settings changed (via API diff)
- Support custom week definitions (Mon-Thu, Fri-Sun split weeks)
- Show notification when settings are outdated

---

## References

- [Clockify API Documentation - User Endpoint](https://docs.clockify.me/#tag/User)
- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [date-fns-tz Documentation](https://github.com/marnusw/date-fns-tz)
- [ARCHITECTURE.md - Clockify API Integration](../ARCHITECTURE.md#clockify-api-integration)
