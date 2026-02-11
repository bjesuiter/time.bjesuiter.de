# Better Auth Security Implementation Guide

**Date**: January 20, 2026  
**Target File**: `src/lib/auth/auth.ts`  
**Estimated Time**: 5-10 minutes

---

## Current Configuration

```typescript
// src/lib/auth/auth.ts (CURRENT)
import { db } from "@/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { reactStartCookies } from "better-auth/react-start";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://time.bjesuiter.de",
  ],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [reactStartCookies()],
});
```

**Issues**:

- ❌ No explicit session configuration
- ❌ No explicit cookie security settings
- ❌ No CSRF/origin validation verification
- ❌ No IP tracking

---

## Recommended Configuration

```typescript
// src/lib/auth/auth.ts (RECOMMENDED)
import { db } from "@/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { reactStartCookies } from "better-auth/react-start";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),

  // ✅ CSRF & Open Redirect Protection
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://time.bjesuiter.de",
  ],

  emailAndPassword: {
    enabled: true,
  },

  // ✅ NEW: Session Configuration
  session: {
    // Total session lifetime before expiration
    expiresIn: 60 * 60 * 24 * 7, // 7 days

    // How often to refresh session expiration on use
    updateAge: 60 * 60 * 24, // 1 day

    // Optional: Disable automatic session refresh for stricter security
    // disableSessionRefresh: false, // default: false
  },

  // ✅ NEW: Advanced Security Settings
  advanced: {
    // CSRF Protection
    disableCSRFCheck: false, // ✅ ENABLED (default)

    // Origin Validation
    disableOriginCheck: false, // ✅ ENABLED (default)

    // Secure Cookies
    useSecureCookies: true, // ✅ ENABLED (auto in production)

    // Default cookie attributes for ALL cookies
    defaultCookieAttributes: {
      httpOnly: true, // Prevent XSS attacks
      secure: true, // HTTPS only
      sameSite: "lax", // CSRF protection
    },

    // Session token specific configuration
    cookies: {
      session_token: {
        name: "session_token",
        attributes: {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
        },
      },
    },

    // IP Tracking for Security Auditing
    ipAddress: {
      // Headers to check for client IP (in order of preference)
      ipAddressHeaders: [
        "x-client-ip",
        "x-forwarded-for",
        "cf-connecting-ip", // Cloudflare
        "x-real-ip", // Nginx
      ],
      // Enable IP tracking
      disableIpTracking: false, // ✅ ENABLED
    },
  },

  plugins: [reactStartCookies()],
});
```

---

## Step-by-Step Implementation

### Step 1: Add Session Configuration

After `emailAndPassword`, add:

```typescript
session: {
  expiresIn: 60 * 60 * 24 * 7,  // 7 days
  updateAge: 60 * 60 * 24,       // 1 day
},
```

**Why**:

- Makes session timeout explicit and auditable
- Matches Better Auth defaults but documents intent
- Easy to adjust if security requirements change

### Step 2: Add Advanced Security Block

After `emailAndPassword`, add the entire `advanced` object:

```typescript
advanced: {
  disableCSRFCheck: false,
  disableOriginCheck: false,
  useSecureCookies: true,
  defaultCookieAttributes: {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  },
  cookies: {
    session_token: {
      name: "session_token",
      attributes: {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      },
    },
  },
  ipAddress: {
    ipAddressHeaders: [
      "x-client-ip",
      "x-forwarded-for",
      "cf-connecting-ip",
      "x-real-ip",
    ],
    disableIpTracking: false,
  },
},
```

### Step 3: Verify Structure

Your file should look like:

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  trustedOrigins: [...],
  emailAndPassword: { enabled: true },
  session: { ... },           // ✅ NEW
  advanced: { ... },          // ✅ NEW
  plugins: [reactStartCookies()],
});
```

### Step 4: Test

```bash
# Run your dev server
bun run dev

# Check for TypeScript errors
bun run build

# Verify in browser DevTools:
# 1. Open DevTools (F12)
# 2. Go to Application → Cookies → localhost:3000
# 3. Check session_token cookie:
#    - HttpOnly: ✅ checked
#    - Secure: ✅ checked (in production)
#    - SameSite: ✅ Lax
```

### Step 5: Commit

```bash
git add src/lib/auth/auth.ts
git commit -m "security: harden Better Auth configuration with explicit session and cookie settings"
git push
```

---

## Security Settings Explained

### Session Configuration

| Setting     | Value  | Purpose                         |
| ----------- | ------ | ------------------------------- |
| `expiresIn` | 7 days | Total session lifetime          |
| `updateAge` | 1 day  | How often to refresh expiration |

**How it works**:

1. User logs in → session created with 7-day expiration
2. User uses app → after 1 day, expiration is extended to 7 days from now
3. User inactive for 7 days → session expires, must log in again

**For higher security**:

- Reduce `expiresIn` to 3-4 days
- Reduce `updateAge` to 12 hours

### Cookie Security

| Attribute  | Value   | Purpose                                   |
| ---------- | ------- | ----------------------------------------- |
| `httpOnly` | `true`  | Blocks JavaScript access (XSS protection) |
| `secure`   | `true`  | Only sent over HTTPS                      |
| `sameSite` | `"lax"` | CSRF protection                           |

**SameSite Values**:

- `"lax"` (recommended): Allows top-level navigation, blocks cross-site requests
- `"strict"`: Blocks all cross-site requests (breaks OAuth flows)
- `"none"`: Allows cross-site requests (requires `secure: true`)

### CSRF & Origin Protection

| Setting              | Value   | Purpose                               |
| -------------------- | ------- | ------------------------------------- |
| `disableCSRFCheck`   | `false` | Verify requests from trusted origins  |
| `disableOriginCheck` | `false` | Block requests from untrusted domains |

**How it works**:

1. Request arrives with `Origin` header
2. Better Auth checks if origin is in `trustedOrigins`
3. If not in list, request is rejected with 403 Forbidden

**Your trusted origins**:

- `http://localhost:3000` (dev)
- `http://localhost:3001` (dev memory mode)
- `https://time.bjesuiter.de` (production)

### IP Tracking

| Setting             | Value   | Purpose                      |
| ------------------- | ------- | ---------------------------- |
| `disableIpTracking` | `false` | Store client IP with session |
| `ipAddressHeaders`  | [...]   | Headers to check for IP      |

**Benefits**:

- Detect unusual login locations
- Identify potential account compromise
- Audit trail for security investigations

**Privacy Note**:

- IP addresses are stored in database
- Consider privacy policy implications
- Can be disabled with `disableIpTracking: true`

---

## Testing Checklist

### ✅ Test 1: CSRF Protection

```bash
# Test that requests from untrusted origins are blocked
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Expected: 403 Forbidden
```

### ✅ Test 2: Cookie Attributes

```bash
# In browser DevTools:
# 1. F12 → Application → Cookies → localhost:3000
# 2. Click on "session_token"
# 3. Verify:
#    - HttpOnly: ✅ checked
#    - Secure: ✅ checked (in production)
#    - SameSite: ✅ Lax
```

### ✅ Test 3: Session Expiration

```bash
# 1. Log in to the app
# 2. Check database for session record:
#    SELECT * FROM session WHERE userId = 'your-user-id';
# 3. Verify expiresAt is ~7 days from now
# 4. Wait 1 day and use the app
# 5. Verify expiresAt is updated to ~7 days from now
```

### ✅ Test 4: IP Tracking

```bash
# 1. Log in to the app
# 2. Check database for session record:
#    SELECT ipAddress FROM session WHERE userId = 'your-user-id';
# 3. Verify IP address is captured
```

---

## Rollback Plan

If something breaks, revert to the original configuration:

```bash
git revert HEAD
git push
```

The original configuration is still secure (uses Better Auth defaults), just not explicitly configured.

---

## Additional Security Improvements (Optional)

### 1. Disable User Signup

**File**: `.env`

```bash
# Current
ALLOW_USER_SIGNUP="true"

# Recommended (for internal tool)
ALLOW_USER_SIGNUP="false"
```

### 2. Remove Admin Credentials After Setup

**File**: `.env`

```bash
# After first admin setup, remove or comment out:
# ADMIN_EMAIL="admin@example.com"
# ADMIN_LABEL="Admin User"
# ADMIN_PASSWORD="change_this_password_123"
```

### 3. Rotate BETTER_AUTH_SECRET Periodically

**File**: `.env`

```bash
# Generate new secret
openssl rand -base64 32

# Update BETTER_AUTH_SECRET
BETTER_AUTH_SECRET=<new-secret>
```

---

## References

- [Better Auth Security Docs](https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/reference/security.mdx)
- [Session Management](https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/concepts/session-management.mdx)
- [Cookie Configuration](https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/concepts/cookies.mdx)
- [Options Reference](https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/reference/options.mdx)

---

## Questions?

Refer to the full research document: `agent/summaries/better_auth_security_research.md`
