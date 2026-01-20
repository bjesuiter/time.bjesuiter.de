# Implementation Guide: Zod Validation Refactor

## Quick Start

### Step 1: Create Validation Schema File

Create `src/lib/validation/schemas.ts`:

```typescript
import { z } from 'zod'

// ============================================================================
// USER AUTHENTICATION SCHEMAS
// ============================================================================

export const signUpSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
  name: z.string().optional().default(''),
})

export type SignUpInput = z.infer<typeof signUpSchema>

export const registerAdminSchema = z.object({
  force: z.boolean().optional().default(false),
})

export type RegisterAdminInput = z.infer<typeof registerAdminSchema>

// ============================================================================
// CLOCKIFY CONFIGURATION SCHEMAS
// ============================================================================

const validateTimeZone = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export const validateClockifyKeySchema = z.object({
  apiKey: z.string()
    .min(1, 'API key is required')
    .max(255, 'API key is too long'),
})

export type ValidateClockifyKeyInput = z.infer<typeof validateClockifyKeySchema>

export const saveClockifyConfigSchema = z.object({
  clockifyApiKey: z.string()
    .min(1, 'API key is required'),
  clockifyWorkspaceId: z.string()
    .min(1, 'Workspace ID is required'),
  clockifyUserId: z.string()
    .min(1, 'User ID is required'),
  timeZone: z.string()
    .refine(validateTimeZone, 'Invalid timezone'),
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
    .datetime('Invalid date format')
    .nullable()
    .optional(),
})

export type SaveClockifyConfigInput = z.infer<typeof saveClockifyConfigSchema>

export const getClockifyWorkspacesSchema = z.object({
  apiKey: z.string().optional(),
})

export type GetClockifyWorkspacesInput = z.infer<typeof getClockifyWorkspacesSchema>

export const getClockifyClientsSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  apiKey: z.string().optional(),
})

export type GetClockifyClientsInput = z.infer<typeof getClockifyClientsSchema>

export const getClockifyProjectsSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  clientId: z.string().optional(),
  apiKey: z.string().optional(),
})

export type GetClockifyProjectsInput = z.infer<typeof getClockifyProjectsSchema>

export const getWeeklyTimeSummarySchema = z.object({
  weekStartDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  forceRefresh: z.boolean().optional().default(false),
})

export type GetWeeklyTimeSummaryInput = z.infer<typeof getWeeklyTimeSummarySchema>

export const getCumulativeOvertimeSchema = z.object({
  currentWeekStartDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
})

export type GetCumulativeOvertimeInput = z.infer<typeof getCumulativeOvertimeSchema>

// ============================================================================
// CONFIGURATION SCHEMAS
// ============================================================================

export const createConfigSchema = z.object({
  projectIds: z.array(z.string().min(1, 'Project ID cannot be empty'))
    .min(1, 'At least one project must be selected'),
  projectNames: z.array(z.string().min(1, 'Project name cannot be empty'))
    .min(1, 'At least one project name must be provided'),
  validFrom: z.string()
    .datetime('Invalid date format'),
})
  .refine(
    (data) => data.projectIds.length === data.projectNames.length,
    {
      message: 'Project IDs and names must have the same length',
      path: ['projectIds'],
    }
  )

export type CreateConfigInput = z.infer<typeof createConfigSchema>

export const updateConfigSchema = z.object({
  configId: z.string().min(1, 'Config ID is required'),
  validFrom: z.string()
    .datetime('Invalid date format')
    .optional(),
  validUntil: z.string()
    .datetime('Invalid date format')
    .nullable()
    .optional(),
  projectIds: z.array(z.string().min(1))
    .optional(),
  projectNames: z.array(z.string().min(1))
    .optional(),
})
  .refine(
    (data) => {
      if (data.projectIds && data.projectNames) {
        return data.projectIds.length === data.projectNames.length
      }
      return true
    },
    {
      message: 'Project IDs and names must have the same length',
      path: ['projectIds'],
    }
  )

export type UpdateConfigInput = z.infer<typeof updateConfigSchema>

export const getTrackedProjectsSchema = z.object({
  date: z.string()
    .datetime('Invalid date format')
    .optional(),
})

export type GetTrackedProjectsInput = z.infer<typeof getTrackedProjectsSchema>

export const getConfigHistorySchema = z.object({
  configType: z.string().optional().default('tracked_projects'),
})

export type GetConfigHistoryInput = z.infer<typeof getConfigHistorySchema>

export const deleteConfigHistorySchema = z.object({
  configType: z.string().optional().default('tracked_projects'),
})

export type DeleteConfigHistoryInput = z.infer<typeof deleteConfigHistorySchema>

export const deleteConfigEntrySchema = z.object({
  configId: z.string().min(1, 'Config ID is required'),
})

export type DeleteConfigEntryInput = z.infer<typeof deleteConfigEntrySchema>
```

### Step 2: Update Server Functions

**Example: `src/server/userServerFns.ts`**

```typescript
import { createServerFn } from "@tanstack/react-start"
import { signUpSchema, registerAdminSchema } from "@/lib/validation/schemas"
import { envStore } from "@/lib/env/envStore"
import { db } from "@/db"
import { eq } from "drizzle-orm"
import { user } from "@/db/schema/better-auth"
import { auth } from "@/lib/auth/auth"

export const isUserSignupAllowed = createServerFn({ method: "GET" }).handler(
  async () => {
    return envStore.ALLOW_USER_SIGNUP
  },
)

export const signUpUser = createServerFn({ method: "POST" })
  .inputValidator(signUpSchema)  // ✅ Use schema directly
  .handler(async ({ data }) => {
    if (!envStore.ALLOW_USER_SIGNUP) {
      throw new Error("User registration is currently disabled")
    }

    const result = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
    })

    if (!result) {
      throw new Error("Failed to create account")
    }

    return { success: true }
  })

export const registerAdminUser = createServerFn({ method: "POST" })
  .inputValidator(registerAdminSchema)  // ✅ Use schema directly
  .handler(async ({ data }) => {
    const { force } = data
    
    if (!envStore.ADMIN_EMAIL || !envStore.ADMIN_PASSWORD) {
      throw new Response(
        "Admin credentials are not configured. Please set ADMIN_EMAIL, ADMIN_LABEL, and ADMIN_PASSWORD in your .env file.",
        { status: 500 },
      )
    }

    // ... rest of handler
  })
```

**Example: `src/server/clockifyServerFns.ts`**

```typescript
import { createServerFn } from "@tanstack/react-start"
import {
  validateClockifyKeySchema,
  saveClockifyConfigSchema,
  getClockifyWorkspacesSchema,
  getWeeklyTimeSummarySchema,
} from "@/lib/validation/schemas"
import { db } from "@/db"
import { userClockifyConfig } from "@/db/schema/clockify"
import { auth } from "@/lib/auth/auth"
import * as clockifyClient from "@/lib/clockify/client"

async function getAuthenticatedUserId(request: Request): Promise<string> {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session?.user) {
    throw new Response("Unauthorized", { status: 401 })
  }

  return session.user.id
}

export const validateClockifyKey = createServerFn({ method: "POST" })
  .inputValidator(validateClockifyKeySchema)  // ✅ Use schema
  .handler(async ({ data, request }) => {
    await getAuthenticatedUserId(request)

    const result = await clockifyClient.validateApiKey(data.apiKey)

    if (!result.success) {
      return {
        success: false,
        error: result.error.message,
      }
    }

    return {
      success: true,
      user: result.data,
    }
  })

export const saveClockifyConfig = createServerFn({ method: "POST" })
  .inputValidator(saveClockifyConfigSchema)  // ✅ Use schema
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request)

    try {
      const existingConfig = await db.query.userClockifyConfig.findFirst({
        where: eq(userClockifyConfig.userId, userId),
      })

      if (existingConfig) {
        await db
          .update(userClockifyConfig)
          .set({
            clockifyApiKey: data.clockifyApiKey,
            clockifyWorkspaceId: data.clockifyWorkspaceId,
            clockifyUserId: data.clockifyUserId,
            timeZone: data.timeZone,
            weekStart: data.weekStart,
            regularHoursPerWeek: data.regularHoursPerWeek,
            workingDaysPerWeek: data.workingDaysPerWeek,
            selectedClientId: data.selectedClientId || null,
            selectedClientName: data.selectedClientName || null,
            cumulativeOvertimeStartDate: data.cumulativeOvertimeStartDate || null,
            updatedAt: new Date(),
          })
          .where(eq(userClockifyConfig.userId, userId))
      } else {
        await db.insert(userClockifyConfig).values({
          userId,
          clockifyApiKey: data.clockifyApiKey,
          clockifyWorkspaceId: data.clockifyWorkspaceId,
          clockifyUserId: data.clockifyUserId,
          timeZone: data.timeZone,
          weekStart: data.weekStart,
          regularHoursPerWeek: data.regularHoursPerWeek,
          workingDaysPerWeek: data.workingDaysPerWeek,
          selectedClientId: data.selectedClientId || null,
          selectedClientName: data.selectedClientName || null,
          cumulativeOvertimeStartDate: data.cumulativeOvertimeStartDate || null,
        })
      }

      return { success: true }
    } catch (error) {
      console.error("Error saving Clockify config:", error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save configuration",
      }
    }
  })

export const getClockifyWorkspaces = createServerFn({ method: "POST" })
  .inputValidator(getClockifyWorkspacesSchema)  // ✅ Use schema
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request)

    let apiKey = data.apiKey

    if (!apiKey) {
      const config = await db.query.userClockifyConfig.findFirst({
        where: eq(userClockifyConfig.userId, userId),
      })

      if (!config) {
        return {
          success: false,
          error: "No API key provided and no stored configuration found",
        }
      }

      apiKey = config.clockifyApiKey
    }

    const result = await clockifyClient.getWorkspaces(apiKey)

    if (!result.success) {
      return {
        success: false,
        error: result.error.message,
      }
    }

    return {
      success: true,
      workspaces: result.data,
    }
  })
```

**Example: `src/server/configServerFns.ts`**

```typescript
import { createServerFn } from "@tanstack/react-start"
import {
  createConfigSchema,
  updateConfigSchema,
  getTrackedProjectsSchema,
  getConfigHistorySchema,
  deleteConfigEntrySchema,
} from "@/lib/validation/schemas"
import { db } from "@/db"
import { configChronic } from "@/db/schema/config"
import { auth } from "@/lib/auth/auth"
import { invalidateCacheFromDate } from "./cacheHelpers"
import { and, eq } from "drizzle-orm"

async function getAuthenticatedUserId(request: Request): Promise<string> {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session?.user) {
    throw new Response("Unauthorized", { status: 401 })
  }

  return session.user.id
}

export const createConfig = createServerFn({ method: "POST" })
  .inputValidator(createConfigSchema)  // ✅ Use schema
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request)
    const validFromDate = new Date(data.validFrom)

    try {
      // ... handler logic
      const newConfig = await db
        .insert(configChronic)
        .values({
          userId,
          configType: "tracked_projects",
          value: JSON.stringify({
            projectIds: data.projectIds,
            projectNames: data.projectNames,
          }),
          validFrom: validFromDate,
          validUntil: null,
        })
        .returning()

      return {
        success: true,
        config: {
          id: newConfig[0].id,
          value: JSON.parse(newConfig[0].value),
          validFrom: newConfig[0].validFrom,
          validUntil: newConfig[0].validUntil,
        },
      }
    } catch (error) {
      console.error("Error creating config:", error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create configuration",
      }
    }
  })

export const getTrackedProjects = createServerFn({ method: "GET" })
  .inputValidator(getTrackedProjectsSchema)  // ✅ Use schema
  .handler(async ({ data, request }) => {
    const userId = await getAuthenticatedUserId(request)
    const targetDate = data?.date ? new Date(data.date) : new Date()

    try {
      // ... handler logic
    } catch (error) {
      console.error("Error getting tracked projects:", error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get tracked projects",
      }
    }
  })
```

### Step 3: Test Schemas

Create `src/lib/validation/schemas.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import {
  signUpSchema,
  saveClockifyConfigSchema,
  createConfigSchema,
} from './schemas'

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
  })

  test('rejects short password', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })
})

describe('saveClockifyConfigSchema', () => {
  test('accepts valid config', () => {
    const result = saveClockifyConfigSchema.safeParse({
      clockifyApiKey: 'key123',
      clockifyWorkspaceId: 'ws123',
      clockifyUserId: 'user123',
      timeZone: 'Europe/Berlin',
      weekStart: 'MONDAY',
      regularHoursPerWeek: 40,
      workingDaysPerWeek: 5,
    })
    expect(result.success).toBe(true)
  })

  test('rejects invalid timezone', () => {
    const result = saveClockifyConfigSchema.safeParse({
      clockifyApiKey: 'key123',
      clockifyWorkspaceId: 'ws123',
      clockifyUserId: 'user123',
      timeZone: 'Invalid/Timezone',
      weekStart: 'MONDAY',
      regularHoursPerWeek: 40,
      workingDaysPerWeek: 5,
    })
    expect(result.success).toBe(false)
  })

  test('rejects invalid weekStart', () => {
    const result = saveClockifyConfigSchema.safeParse({
      clockifyApiKey: 'key123',
      clockifyWorkspaceId: 'ws123',
      clockifyUserId: 'user123',
      timeZone: 'Europe/Berlin',
      weekStart: 'TUESDAY',
      regularHoursPerWeek: 40,
      workingDaysPerWeek: 5,
    })
    expect(result.success).toBe(false)
  })

  test('rejects negative regularHoursPerWeek', () => {
    const result = saveClockifyConfigSchema.safeParse({
      clockifyApiKey: 'key123',
      clockifyWorkspaceId: 'ws123',
      clockifyUserId: 'user123',
      timeZone: 'Europe/Berlin',
      weekStart: 'MONDAY',
      regularHoursPerWeek: -10,
      workingDaysPerWeek: 5,
    })
    expect(result.success).toBe(false)
  })
})

describe('createConfigSchema', () => {
  test('accepts valid config', () => {
    const result = createConfigSchema.safeParse({
      projectIds: ['proj1', 'proj2'],
      projectNames: ['Project 1', 'Project 2'],
      validFrom: '2026-01-20T00:00:00Z',
    })
    expect(result.success).toBe(true)
  })

  test('rejects mismatched array lengths', () => {
    const result = createConfigSchema.safeParse({
      projectIds: ['proj1', 'proj2'],
      projectNames: ['Project 1'],
      validFrom: '2026-01-20T00:00:00Z',
    })
    expect(result.success).toBe(false)
  })

  test('rejects empty arrays', () => {
    const result = createConfigSchema.safeParse({
      projectIds: [],
      projectNames: [],
      validFrom: '2026-01-20T00:00:00Z',
    })
    expect(result.success).toBe(false)
  })
})
```

Run tests:
```bash
bun test src/lib/validation/schemas.test.ts
```

---

## Migration Checklist

- [ ] Create `src/lib/validation/schemas.ts`
- [ ] Update `src/server/userServerFns.ts`
- [ ] Update `src/server/clockifyServerFns.ts`
- [ ] Update `src/server/configServerFns.ts`
- [ ] Update `src/server/cacheServerFns.ts`
- [ ] Create `src/lib/validation/schemas.test.ts`
- [ ] Run tests: `bun test src/lib/validation/schemas.test.ts`
- [ ] Test server functions manually
- [ ] Commit changes

---

## Benefits After Migration

✅ **Runtime Validation**: All inputs validated before reaching handlers
✅ **Type Safety**: Types inferred from schemas
✅ **Error Messages**: Clear, user-friendly validation errors
✅ **Testability**: Schemas can be tested independently
✅ **Maintainability**: Single source of truth for input validation
✅ **Consistency**: All server functions follow same pattern
