# TanStack Start Zod Validation Review & Improvements

## Current State Analysis

Your project uses **inline type validators** instead of Zod schemas:

```typescript
// Current pattern (inline validators)
.inputValidator((data: { email: string; password: string }) => data)
```

**Issues with this approach:**
1. ❌ No runtime validation - types are TypeScript-only
2. ❌ No error messages - invalid data passes through silently
3. ❌ Duplicated type definitions - types in validator AND handler
4. ❌ No coercion/transformation - raw input used as-is
5. ❌ Hard to test - no schema to validate against

---

## TanStack Start Recommended Pattern

From official docs and real-world examples:

```typescript
// ✅ Recommended: Use Zod schemas
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
})

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator(loginSchema)  // Pass schema directly
  .handler(async ({ data }) => {
    // data is fully typed and validated
  })
```

**Benefits:**
- ✅ Runtime validation with clear error messages
- ✅ Single source of truth (schema)
- ✅ Type inference from schema
- ✅ Data transformation/coercion
- ✅ Testable schemas

---

## Improvements for Your Codebase

### 1. User Server Functions

**Before:**
```typescript
export const signUpUser = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { email: string; password: string; name?: string }) => data,
  )
  .handler(async ({ data }) => {
    // No validation of email format, password strength, etc.
  })
```

**After:**
```typescript
import { z } from 'zod'

const signUpSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
  name: z.string().optional().default(''),
})

export const signUpUser = createServerFn({ method: "POST" })
  .inputValidator(signUpSchema)
  .handler(async ({ data }) => {
    // data is validated and typed
    const result = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
    })
    // ...
  })
```

**Benefits:**
- Email format validated at runtime
- Password strength enforced
- Clear error messages to client
- Type inference: `data` is `z.infer<typeof signUpSchema>`

---

### 2. Clockify Server Functions

**Before:**
```typescript
export const saveClockifyConfig = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      clockifyApiKey: string;
      clockifyWorkspaceId: string;
      clockifyUserId: string;
      timeZone: string;
      weekStart: string;
      regularHoursPerWeek: number;
      workingDaysPerWeek: number;
      selectedClientId?: string | null;
      selectedClientName?: string | null;
      cumulativeOvertimeStartDate?: string | null;
    }) => data,
  )
  .handler(async ({ data, request }) => {
    // No validation of:
    // - timeZone is valid IANA timezone
    // - weekStart is MONDAY or SUNDAY
    // - regularHoursPerWeek is positive
    // - dates are valid ISO strings
  })
```

**After:**
```typescript
import { z } from 'zod'

const clockifyConfigSchema = z.object({
  clockifyApiKey: z.string().min(1, 'API key is required'),
  clockifyWorkspaceId: z.string().min(1, 'Workspace ID is required'),
  clockifyUserId: z.string().min(1, 'User ID is required'),
  timeZone: z.string().refine(
    (tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz })
        return true
      } catch {
        return false
      }
    },
    'Invalid timezone'
  ),
  weekStart: z.enum(['MONDAY', 'SUNDAY'], {
    errorMap: () => ({ message: 'Week start must be MONDAY or SUNDAY' }),
  }),
  regularHoursPerWeek: z.number()
    .positive('Regular hours must be positive')
    .max(168, 'Regular hours cannot exceed 168 (24*7)'),
  workingDaysPerWeek: z.number()
    .int('Working days must be an integer')
    .min(1, 'At least 1 working day required')
    .max(7, 'Cannot exceed 7 working days'),
  selectedClientId: z.string().nullable().optional(),
  selectedClientName: z.string().nullable().optional(),
  cumulativeOvertimeStartDate: z.string()
    .datetime()
    .nullable()
    .optional(),
})

export const saveClockifyConfig = createServerFn({ method: "POST" })
  .inputValidator(clockifyConfigSchema)
  .handler(async ({ data, request }) => {
    // All data is validated and typed
    // ...
  })
```

**Benefits:**
- Timezone validation prevents runtime errors
- Enum validation for weekStart
- Numeric constraints enforced
- ISO datetime validation
- Clear error messages for each field

---

### 3. Config Server Functions

**Before:**
```typescript
export const createConfig = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      projectIds: string[];
      projectNames: string[];
      validFrom: string;
    }) => data,
  )
  .handler(async ({ data, request }) => {
    const validFromDate = new Date(data.validFrom)
    // No validation that:
    // - projectIds and projectNames have same length
    // - validFrom is valid ISO date
    // - arrays are not empty
  })
```

**After:**
```typescript
import { z } from 'zod'

const createConfigSchema = z.object({
  projectIds: z.array(z.string().min(1))
    .min(1, 'At least one project must be selected'),
  projectNames: z.array(z.string().min(1))
    .min(1, 'At least one project name must be provided'),
  validFrom: z.string().datetime('Invalid date format'),
})
  .refine(
    (data) => data.projectIds.length === data.projectNames.length,
    {
      message: 'Project IDs and names must have the same length',
      path: ['projectIds'], // Show error on projectIds field
    }
  )

export const createConfig = createServerFn({ method: "POST" })
  .inputValidator(createConfigSchema)
  .handler(async ({ data, request }) => {
    const validFromDate = new Date(data.validFrom)
    // data is guaranteed valid
    // ...
  })
```

**Benefits:**
- Array length validation
- Cross-field validation (projectIds.length === projectNames.length)
- ISO datetime validation
- Error path points to correct field

---

### 4. Weekly Summary Function

**Before:**
```typescript
export const getWeeklyTimeSummary = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { weekStartDate: string; forceRefresh?: boolean }) => data,
  )
  .handler(async ({ data, request }) => {
    const weekStartDate = parseLocalDateInTz(
      data.weekStartDate,
      userTimeZone,
    )
    // No validation that weekStartDate is valid ISO date
  })
```

**After:**
```typescript
import { z } from 'zod'

const weeklyTimeSummarySchema = z.object({
  weekStartDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  forceRefresh: z.boolean().optional().default(false),
})

export const getWeeklyTimeSummary = createServerFn({ method: "POST" })
  .inputValidator(weeklyTimeSummarySchema)
  .handler(async ({ data, request }) => {
    const weekStartDate = parseLocalDateInTz(
      data.weekStartDate,
      userTimeZone,
    )
    // data.weekStartDate is guaranteed valid format
    // ...
  })
```

---

## Implementation Strategy

### Phase 1: Create Schema File
```typescript
// src/lib/validation/schemas.ts
import { z } from 'zod'

export const signUpSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
  name: z.string().optional().default(''),
})

export const clockifyConfigSchema = z.object({
  // ... (see above)
})

export const createConfigSchema = z.object({
  // ... (see above)
})

// Export inferred types
export type SignUpInput = z.infer<typeof signUpSchema>
export type ClockifyConfigInput = z.infer<typeof clockifyConfigSchema>
```

### Phase 2: Update Server Functions
Replace inline validators with schema references:
```typescript
import { signUpSchema } from '@/lib/validation/schemas'

export const signUpUser = createServerFn({ method: "POST" })
  .inputValidator(signUpSchema)
  .handler(async ({ data }) => {
    // data is typed as SignUpInput
  })
```

### Phase 3: Error Handling
TanStack Start automatically returns validation errors:
```typescript
// Client receives:
{
  success: false,
  error: "Validation failed",
  issues: [
    { path: ['email'], message: 'Invalid email address' },
    { path: ['password'], message: 'Password must be at least 8 characters' }
  ]
}
```

---

## Best Practices

### 1. Reusable Schemas
```typescript
// Define once, use everywhere
const emailSchema = z.string().email().max(255)
const passwordSchema = z.string().min(8).max(100)

const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})
```

### 2. Custom Refinements
```typescript
const configSchema = z.object({
  projectIds: z.array(z.string()),
  projectNames: z.array(z.string()),
})
  .refine(
    (data) => data.projectIds.length === data.projectNames.length,
    {
      message: 'Arrays must have same length',
      path: ['projectIds'],
    }
  )
```

### 3. Async Validation
```typescript
const uniqueEmailSchema = z.string().email().refine(
  async (email) => {
    const existing = await db.query.user.findFirst({
      where: eq(user.email, email),
    })
    return !existing
  },
  { message: 'Email already registered' }
)
```

### 4. Transformation
```typescript
const configSchema = z.object({
  validFrom: z.string().datetime().transform((str) => new Date(str)),
  weekStart: z.enum(['MONDAY', 'SUNDAY']),
})
```

---

## Testing Schemas

```typescript
import { describe, test, expect } from 'bun:test'
import { signUpSchema } from '@/lib/validation/schemas'

describe('signUpSchema', () => {
  test('accepts valid input', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'securepass123',
    })
    expect(result.success).toBe(true)
  })

  test('rejects invalid email', () => {
    const result = signUpSchema.safeParse({
      email: 'not-an-email',
      password: 'securepass123',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toContain('Invalid email')
  })

  test('rejects short password', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })
})
```

---

## Summary of Changes

| Function | Current | Improvement |
|----------|---------|-------------|
| `signUpUser` | Inline type | Zod schema with email/password validation |
| `saveClockifyConfig` | Inline type | Zod schema with timezone/enum validation |
| `createConfig` | Inline type | Zod schema with cross-field validation |
| `getWeeklyTimeSummary` | Inline type | Zod schema with date format validation |
| `validateClockifyKey` | Inline type | Zod schema |
| `getClockifyWorkspaces` | Inline type | Zod schema |
| `getClockifyClients` | Inline type | Zod schema |
| `getClockifyProjects` | Inline type | Zod schema |

**Total Impact:**
- ✅ Runtime validation on all inputs
- ✅ Clear error messages
- ✅ Type safety
- ✅ Testable schemas
- ✅ Single source of truth
