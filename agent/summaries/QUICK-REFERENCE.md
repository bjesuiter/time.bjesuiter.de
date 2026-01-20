# Zod Validation Quick Reference

## Current Pattern (❌ Not Recommended)
```typescript
.inputValidator((data: { email: string; password: string }) => data)
```

## Recommended Pattern (✅)
```typescript
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Too short'),
})

.inputValidator(schema)
```

---

## Common Validators

### Strings
```typescript
z.string()                           // Any string
z.string().email()                   // Email format
z.string().url()                     // URL format
z.string().min(8)                    // Minimum length
z.string().max(255)                  // Maximum length
z.string().regex(/^\d{4}-\d{2}-\d{2}$/)  // Date format
```

### Numbers
```typescript
z.number()                           // Any number
z.number().int()                     // Integer only
z.number().positive()                // > 0
z.number().min(1)                    // Minimum value
z.number().max(168)                  // Maximum value
```

### Arrays
```typescript
z.array(z.string())                  // Array of strings
z.array(z.string()).min(1)           // At least 1 item
z.array(z.string()).max(10)          // At most 10 items
```

### Enums
```typescript
z.enum(['MONDAY', 'SUNDAY'])         // One of these values
```

### Optional/Nullable
```typescript
z.string().optional()                // Can be undefined
z.string().nullable()                // Can be null
z.string().optional().default('')    // Default value
```

---

## Custom Validators

### Timezone Validation
```typescript
const validateTimeZone = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

timeZone: z.string().refine(validateTimeZone, 'Invalid timezone')
```

### Cross-Field Validation
```typescript
z.object({
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

### Async Validation (Database Lookup)
```typescript
email: z.string().email().refine(
  async (email) => {
    const existing = await db.query.user.findFirst({
      where: eq(user.email, email),
    })
    return !existing
  },
  { message: 'Email already registered' }
)
```

---

## Type Inference

```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

// Automatically infer type from schema
type Input = z.infer<typeof schema>

// Equivalent to:
// type Input = {
//   email: string
//   password: string
// }
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
})
```

---

## Files to Review

1. **zod-validation-review.md** - Detailed analysis and improvements
2. **implementation-guide.md** - Step-by-step implementation with code
3. **SUMMARY.md** - Executive summary and roadmap

---

## Key Statistics

- **17 server functions** to update
- **5-8 hours** total effort
- **0 breaking changes** for clients
- **100% backward compatible**

---

## Next Steps

1. Create `src/lib/validation/schemas.ts`
2. Update server functions one file at a time
3. Add tests for schemas
4. Verify all functions work
5. Commit changes

