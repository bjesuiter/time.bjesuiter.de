# Decision: Clockify API Key Storage

**Date**: 2025-10-31\
**Status**: ✅ Decided\
**Context**: Phase 1 - Foundation & Authentication

---

## Problem

The application needs to store users' Clockify API keys to fetch time tracking
data on their behalf. The architecture initially specified using AES-256-GCM
encryption for storing these keys securely.

However, this is a personal project intended for single-user or small-scale use,
where the complexity of implementing encryption may outweigh the security
benefits.

---

## Decision

**Store Clockify API keys in plain text in the database.**

### Rationale

1. **Personal Project Scope**: This is a personal time tracking dashboard,
   likely running locally or in a controlled environment
2. **Reduced Complexity**: Avoiding encryption eliminates:
   - Key management infrastructure
   - Key rotation strategies
   - Key derivation logic
   - Additional dependencies or crypto library decisions
3. **Server-Side Only**: API keys are never exposed to client-side code
4. **Future-Proof**: Encryption can be added later if needed without schema
   changes

### Security Measures Still in Place

- ✅ API keys never sent to client/browser
- ✅ All Clockify API calls happen server-side
- ✅ Session-based authentication required to access keys
- ✅ Database file protected by filesystem permissions
- ✅ User isolation (queries filtered by `userId`)

---

## Implementation

### Schema

```typescript
// user_clockify_config table
{
  id: string (primary key)
  userId: string (foreign key -> user.id, unique)
  clockifyApiKey: string           // Plain text, NOT encrypted
  clockifyWorkspaceId: string
  clockifyUserId: string
  timeZone: string                  // From Clockify user settings
  weekStart: string                 // From Clockify user settings
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Access Pattern

```typescript
// Server-side only
export const fetchClockifyData = createServerFn(
    "GET",
    async (_, { request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) throw new Error("Unauthorized");

        // Fetch user's API key (never sent to client)
        const config = await db.query.userClockifyConfig.findFirst({
            where: eq(userClockifyConfig.userId, session.user.id),
        });

        // Use API key to call Clockify
        const response = await fetch("https://api.clockify.me/api/v1/...", {
            headers: { "X-Api-Key": config.clockifyApiKey },
        });

        // Return processed data (not the API key)
        return processedData;
    },
);
```

---

## Alternatives Considered

### Option 1: AES-256-GCM Encryption (Rejected)

- ❌ Adds significant complexity
- ❌ Requires key management strategy
- ❌ Limited security benefit for personal use
- ❌ Key stored in environment variable anyway (moves the problem)

### Option 2: External Key Management Service (Rejected)

- ❌ Overkill for personal project
- ❌ Additional infrastructure dependency
- ❌ Cost implications

### Option 3: Per-Request API Key (Rejected)

- ❌ User must enter API key on every session
- ❌ Poor user experience
- ❌ Doesn't eliminate storage problem (would need session storage)

---

## Migration Path (If Encryption Needed Later)

If the project scales or security requirements change:

1. Add `clockifyApiKeyEncrypted: Uint8Array` column
2. Add `encryptionKeyVersion: number` column
3. Implement encryption layer with Web Crypto API or Node.js `crypto`
4. Migration script:
   ```typescript
   // Encrypt existing plain text keys
   for (const config of allConfigs) {
       config.clockifyApiKeyEncrypted = await encrypt(config.clockifyApiKey);
       config.clockifyApiKey = null; // Clear plain text
   }
   ```
5. Update access layer to decrypt on read
6. Drop plain text column after verification

---

## Consequences

### Positive

- ✅ Faster implementation
- ✅ Simpler codebase
- ✅ No crypto library dependencies
- ✅ No key management complexity
- ✅ Easier debugging and testing

### Negative

- ⚠️ API keys readable in database file
- ⚠️ If database file is compromised, API keys are exposed
- ⚠️ Not suitable for multi-tenant SaaS without additional measures

### Mitigation for Negatives

- Ensure proper filesystem permissions on database file
- Use HTTPS for all connections
- Regular security audits if project scope expands
- Document encryption migration path

---

## References

- [Better-auth Integration Decision](2025_10_31_better_auth_integration.md)
- [ARCHITECTURE.md - Security Considerations](../ARCHITECTURE.md#security-considerations)
