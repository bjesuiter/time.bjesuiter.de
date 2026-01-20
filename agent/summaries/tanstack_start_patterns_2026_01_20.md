# TanStack Start: Route/Server Separation & API Routes Review

**Date**: January 20, 2026  
**Source**: Official TanStack Start Documentation + GitHub Examples

---

## Key Patterns & Recommendations

### 1. **Two-Tier Server Architecture** ✅

TanStack Start recommends separating server logic into two layers:

#### Pattern: `.functions.ts` + `.server.ts` Split

```
src/utils/
├── users.functions.ts   # Server function wrappers (createServerFn)
├── users.server.ts      # Server-only helpers (DB queries, internal logic)
└── schemas.ts           # Shared validation schemas (client-safe)
```

**Why this works:**
- **`.functions.ts`** exports `createServerFn` wrappers → safe to import anywhere (build process handles tree-shaking)
- **`.server.ts`** contains server-only code → only imported inside server function handlers
- **`.ts`** (no suffix) contains client-safe code (types, schemas, constants)

**Benefit**: Clear separation prevents accidental server code leakage to client bundles.

---

### 2. **Server Functions vs. Route Handlers**

TanStack Start offers **two approaches** for server-side logic:

#### Approach A: Server Functions (`createServerFn`)
```typescript
// users.functions.ts
import { createServerFn } from '@tanstack/react-start'
import { findUserById } from './users.server'

export const getUser = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    return findUserById(data.id)
  })
```

**Advantages:**
- Callable from anywhere (components, loaders, other server functions)
- Type-safe across network boundary
- Automatic RPC stub generation for client
- Built-in validation support

#### Approach B: Route Handlers (`createFileRoute` with `server.handlers`)
```typescript
// routes/api/hello.ts
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return new Response('Hello, World!')
      },
      POST: async ({ request }) => {
        const body = await request.json()
        return Response.json({ message: `Hello, ${body.name}!` })
      }
    }
  }
})
```

**Advantages:**
- Traditional HTTP handler pattern
- Direct access to `request` object
- Full control over response
- Familiar for REST API developers

**Recommendation**: Use **server functions** for most cases (better type safety, more flexible), reserve **route handlers** for:
- Raw binary responses
- Custom content types
- Direct request/response manipulation
- Traditional REST APIs

---

### 3. **File Organization Best Practice**

```typescript
// ✅ CORRECT: Static import in client component
import { getUser } from '~/utils/users.functions'

function UserProfile({ id }) {
  const { data } = useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser({ data: { id } }),
  })
}
```

**Key Rule**: The build process replaces server function implementations with RPC stubs in client bundles. The actual server code **never reaches the browser**.

**⚠️ Avoid**: Dynamic imports for server functions (causes bundler issues)

---

### 4. **Validation & Type Safety**

Use Zod for runtime validation:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const UserSchema = z.object({
  name: z.string().min(1),
  age: z.number().min(0),
})

export const createUser = createServerFn({ method: 'POST' })
  .inputValidator(UserSchema)
  .handler(async ({ data }) => {
    // data is fully typed and validated
    return `Created user: ${data.name}, age ${data.age}`
  })
```

---

### 5. **Request/Response Context**

Access request headers, cookies, and customize responses:

```typescript
import { createServerFn } from '@tanstack/react-start'
import {
  getRequest,
  getRequestHeader,
  setResponseHeaders,
  setResponseStatus,
} from '@tanstack/react-start/server'

export const getCachedData = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const authHeader = getRequestHeader('Authorization')

    setResponseHeaders(
      new Headers({
        'Cache-Control': 'public, max-age=300',
      }),
    )

    setResponseStatus(200)
    return fetchData()
  },
)
```

**Available utilities:**
- `getRequest()` - Full Request object
- `getRequestHeader(name)` - Read specific header
- `setResponseHeader(name, value)` - Set single header
- `setResponseHeaders(headers)` - Set multiple headers
- `setResponseStatus(code)` - Set HTTP status

---

### 6. **Error Handling & Redirects**

```typescript
import { createServerFn } from '@tanstack/react-start'
import { redirect, notFound } from '@tanstack/react-router'

// Throw errors (serialized to client)
export const riskyFunction = createServerFn().handler(async () => {
  if (Math.random() > 0.5) {
    throw new Error('Something went wrong!')
  }
  return { success: true }
})

// Redirect on auth failure
export const requireAuth = createServerFn().handler(async () => {
  const user = await getCurrentUser()
  if (!user) {
    throw redirect({ to: '/login' })
  }
  return user
})

// Throw not-found for missing resources
export const getPost = createServerFn()
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const post = await db.findPost(data.id)
    if (!post) {
      throw notFound()
    }
    return post
  })
```

---

## Recommended Patterns for Your Project

### Pattern 1: Domain-Based Organization
```
src/
├── server/
│   ├── auth/
│   │   ├── auth.functions.ts      # createServerFn wrappers
│   │   ├── auth.server.ts         # DB queries, internal logic
│   │   └── auth.schemas.ts        # Zod schemas (client-safe)
│   ├── clockify/
│   │   ├── clockify.functions.ts
│   │   ├── clockify.server.ts
│   │   └── clockify.schemas.ts
│   └── time-entries/
│       ├── entries.functions.ts
│       ├── entries.server.ts
│       └── entries.schemas.ts
├── routes/
│   ├── index.tsx
│   ├── dashboard.tsx
│   └── api/
│       └── webhooks.ts            # Route handlers for raw HTTP
└── components/
```

### Pattern 2: Server Function Composition
```typescript
// time-entries.server.ts - Internal helpers
export async function validateClockifyEntry(entry: any) {
  // Internal validation logic
}

export async function saveTimeEntry(data: TimeEntry) {
  return db.insert(timeEntries).values(data)
}

// time-entries.functions.ts - Public API
export const createTimeEntry = createServerFn({ method: 'POST' })
  .inputValidator(TimeEntrySchema)
  .handler(async ({ data }) => {
    await validateClockifyEntry(data)
    return saveTimeEntry(data)
  })

export const getTimeEntries = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    return db.query.timeEntries.findMany({
      where: eq(timeEntries.userId, data.userId)
    })
  })
```

### Pattern 3: Middleware for Cross-Cutting Concerns
```typescript
// middleware.ts
export function withAuth(fn: ServerFn) {
  return async (context: any) => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login' })
    return fn({ ...context, user })
  }
}

// usage
export const protectedAction = createServerFn({ method: 'POST' })
  .handler(withAuth(async ({ data, user }) => {
    // user is guaranteed to exist
  }))
```

---

## Key Takeaways

| Aspect | Recommendation |
|--------|-----------------|
| **Server Logic** | Use `createServerFn` for most cases |
| **API Routes** | Use `createFileRoute` with `server.handlers` for raw HTTP |
| **File Organization** | Split into `.functions.ts` + `.server.ts` + `.schemas.ts` |
| **Imports** | Static imports are safe; avoid dynamic imports |
| **Validation** | Use Zod for runtime validation |
| **Error Handling** | Throw errors/redirects; they serialize to client |
| **Request Context** | Use `getRequest()`, `getRequestHeader()`, `setResponseHeaders()` |
| **Type Safety** | Leverage TypeScript + Zod for end-to-end safety |

---

## Applicable to Your Project

Your current structure already follows good patterns:
- ✅ Server functions in `src/server/`
- ✅ Separation from routes
- ✅ Database access in server-only modules

**Suggested improvements:**
1. Adopt `.functions.ts` + `.server.ts` naming convention for clarity
2. Add Zod validation to all server function inputs
3. Use `getRequest()` and `setResponseHeaders()` for Clockify webhook handling
4. Consider middleware pattern for auth checks across multiple functions

