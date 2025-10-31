# Decision: EventSourcingDB vs SQLite

**Date**: 2025-10-31\
**Status**: ✅ DECIDED - Continue with SQLite + Drizzle ORM

---

## TL;DR

**DECISION: Continue with SQLite + Drizzle ORM. Do NOT adopt EventSourcingDB.**

EventSourcingDB is fundamentally the wrong tool for this application. The
current architecture with SQLite and temporal configuration tables
(`config_chronic`) is the correct approach.

---

## Decision Summary

### ✅ Selected Approach: SQLite + Drizzle ORM

**Rationale:**

- ✅ Perfect fit for configuration versioning needs
- ✅ Simple SQL queries to get config at any point in time
- ✅ Well-known pattern (Slowly Changing Dimension Type 2)
- ✅ No additional infrastructure required
- ✅ Works seamlessly with Drizzle ORM
- ✅ Excellent query performance with proper indexing
- ✅ Zero operational overhead
- ✅ Embedded (no separate service)
- ✅ Mature and battle-tested (23+ years)

### ❌ Rejected Approach: EventSourcingDB

**Reasons for rejection:**

- ❌ Separate database server - Requires Docker, HTTP API, operational overhead
- ❌ Wrong abstraction - Application doesn't fit event sourcing patterns
- ❌ Very new product - Released 2025, v1.5.0, only 26 GitHub stars
- ❌ No integration - Incompatible with Better-auth and Drizzle ORM
- ❌ Unnecessary complexity - Would require complete data layer rewrite
- ❌ Application doesn't generate domain events
- ❌ Data comes from external API (Clockify), not internal commands
- ❌ Cache invalidation is computational, not event-driven
- ❌ No need to replay events or rebuild state

---

## Scoring Matrix

Scale: 1 (Poor) to 10 (Excellent)

| Criteria                   | Weight    | SQLite | EventSourcingDB | Winner |
| -------------------------- | --------- | ------ | --------------- | ------ |
| **Fit for Use Case**       | ⬆️ High   | 10     | 2               | SQLite |
| **Operational Simplicity** | ⬆️ High   | 10     | 3               | SQLite |
| **Development Speed**      | 📊 Medium | 10     | 3               | SQLite |
| **Integration w/ Stack**   | ⬆️ High   | 10     | 2               | SQLite |
| **Maturity & Stability**   | 📊 Medium | 10     | 4               | SQLite |
| **Performance**            | 📊 Medium | 10     | 6               | SQLite |
| **Query Capabilities**     | 📊 Medium | 10     | 5               | SQLite |
| **Learning Curve**         | 🔽 Low    | 10     | 3               | SQLite |
| **Community Support**      | 🔽 Low    | 10     | 2               | SQLite |
| **Cost**                   | 🔽 Low    | 10     | 7               | SQLite |

### Weighted Score

- **SQLite**: 10.0 / 10.0 🏆
- **EventSourcingDB**: 3.3 / 10.0 ❌

---

## Architecture Comparison

### Current Architecture (SQLite + Drizzle)

```
┌─────────────────────────────────────────────────────────┐
│                                                           │
│  ┌──────────────┐                                        │
│  │   Browser    │                                        │
│  │  (TanStack)  │                                        │
│  └──────────────┘                                        │
│         │                                                 │
│         │ HTTP                                            │
│         ▼                                                 │
│  ┌───────────────────────────────────────┐               │
│  │   Bun + TanStack Start                │               │
│  │                                        │               │
│  │  ┌──────────────────────────────────┐ │               │
│  │  │  Better-auth                     │ │               │
│  │  └──────────────────────────────────┘ │               │
│  │                                        │               │
│  │  ┌──────────────────────────────────┐ │               │
│  │  │  Drizzle ORM                     │ │               │
│  │  └──────────────────────────────────┘ │               │
│  │             │                          │               │
│  │  ┌──────────────────────────────────┐ │               │
│  │  │  SQLite (single file)            │ │               │
│  │  │  - user, session, account        │ │               │
│  │  │  - config_chronic (temporal)     │ │               │
│  │  │  - cached_daily_sums             │ │               │
│  │  │  - cached_weekly_sums            │ │               │
│  │  └──────────────────────────────────┘ │               │
│  └───────────────────────────────────────┘               │
│                                                           │
│  Components: 3 (Browser, Server, DB)                     │
│  Services: 1 (TanStack Start)                            │
│  Ports: 1 (3000)                                         │
│  External Dependencies: 0                                │
└─────────────────────────────────────────────────────────┘
```

### Hypothetical EventSourcingDB Architecture (DON'T DO THIS)

```
┌─────────────────────────────────────────────────────────┐
│                                                           │
│  ┌──────────────┐                                        │
│  │   Browser    │                                        │
│  └──────────────┘                                        │
│         │ HTTP                                            │
│         ▼                                                 │
│  ┌───────────────────────────────────────┐               │
│  │   Bun + TanStack Start                │               │
│  │                                        │               │
│  │  ┌──────────────────────────────────┐ │               │
│  │  │  Better-auth (NEEDS SQLite!)     │ │ ❌ Doesn't   │
│  │  └──────────────────────────────────┘ │   work with   │
│  │             │                          │   EventSourceDB
│  │  ┌──────────────────────────────────┐ │               │
│  │  │  SQLite (for auth only)          │ │ ⚠️ Need this │
│  │  │  - user, session, account        │ │   anyway     │
│  │  └──────────────────────────────────┘ │               │
│  │                                        │               │
│  │  ┌──────────────────────────────────┐ │               │
│  │  │  EventSourcingDB Client          │ │               │
│  │  └──────────────────────────────────┘ │               │
│  │             │ HTTP API                 │               │
│  └─────────────┼──────────────────────────┘               │
│                ▼                                          │
│  ┌─────────────────────────────────────────┐             │
│  │  EventSourcingDB Server (Docker)        │             │
│  │  - Event store                          │             │
│  │  - EventQL query engine                 │             │
│  │  - API authentication                   │             │
│  └─────────────────────────────────────────┘             │
│                                                           │
│  Components: 5 (Browser, Server, SQLite, Client, EventDB)│
│  Services: 2 (TanStack Start, EventSourcingDB)          │
│  Ports: 2 (3000, 3001)                                   │
│  External Dependencies: 1 (Docker)                       │
│                                                           │
│  ❌ More complex                                         │
│  ❌ Still need SQLite anyway (for Better-auth)          │
│  ❌ Two databases to sync                                │
│  ❌ Additional operational overhead                      │
└─────────────────────────────────────────────────────────┘
```

---

## Use Case Fit Analysis

### Application Characteristics

The time tracking application:

**Data Sources:**

- 📥 Clockify API (external)
- ⚙️ User configuration (simple updates)
- 💾 Cached calculations (derived state)

**Operations:**

- Fetch data from external API
- Cache computed results
- Track config changes over time
- Display historical views

**NOT doing:**

- ❌ Generating domain events
- ❌ Event-driven workflows
- ❌ Complex state machines
- ❌ Event replay scenarios
- ❌ CQRS patterns

**Conclusion:** Event Sourcing is NOT a fit. Temporal tables are PERFECT.

### When Event Sourcing WOULD Make Sense

✅ **Good Use Cases for Event Sourcing:**

- 💰 Financial transaction systems - Every transaction is an immutable event
- 📋 Complex domain logic - State machines with many transitions
- 🔄 Event-driven microservices - Services communicate via events
- 🕐 Temporal queries requiring event replay
- 🔍 Fraud detection and compliance systems

❌ **This Time Tracking App:**

- Fetches data from external API
- Simple config updates
- No event generation or replay

---

## Query Comparison

### Get Current Configuration

**With SQLite (Simple & Fast)**

```sql
SELECT * 
FROM config_chronic 
WHERE userId = '123' 
  AND configType = 'tracked_projects'
  AND validFrom <= CURRENT_TIMESTAMP
  AND (validUntil IS NULL OR validUntil > CURRENT_TIMESTAMP)
```

- ✅ Single query
- ✅ Uses indexes
- ✅ Microsecond latency
- ✅ Easy to understand

**With EventSourcingDB (Complex & Slow)**

```javascript
// Read all config events
const events = [];
for await (
    const event of client.readEvents(`/users/123/config`, {
        recursive: false,
    })
) {
    events.push(event);
}

// Manually reconstruct state
let currentConfig = null;
for (const event of events) {
    if (event.type === "config.tracked_projects.changed") {
        if (event.timestamp <= Date.now()) {
            currentConfig = event.data;
        }
    }
}
```

- ❌ Event replay required
- ❌ HTTP API overhead
- ❌ Millisecond+ latency
- ❌ Complex logic

---

## Performance Comparison

### Read Operations (Get Config for Date)

```
SQLite with Temporal Table:
┌─────────────────────────────────────────┐
│ Query → Index Lookup → Result           │
│ Time: 0.001 - 0.01ms (microseconds)     │
└─────────────────────────────────────────┘

EventSourcingDB:
┌─────────────────────────────────────────┐
│ HTTP Request → Event Stream → Replay →  │
│ Filter → Reconstruct State → Result     │
│ Time: 10-50ms (milliseconds)            │
└─────────────────────────────────────────┘

Performance: SQLite is 1,000x - 50,000x faster
```

### Write Operations (Update Config)

```
SQLite:
┌─────────────────────────────────────────┐
│ BEGIN → UPDATE old (validUntil) →       │
│ INSERT new → COMMIT                     │
│ Time: 0.1 - 1ms                         │
└─────────────────────────────────────────┘

EventSourcingDB:
┌─────────────────────────────────────────┐
│ HTTP Request → Validate → Write Event → │
│ Return Confirmation                      │
│ Time: 10-30ms                            │
└─────────────────────────────────────────┘

Performance: SQLite is 10x - 300x faster
```

---

## Operational Comparison

### Daily Operations

| Task           | SQLite             | EventSourcingDB                     |
| -------------- | ------------------ | ----------------------------------- |
| **Backup**     | Copy one file      | Docker volume backup + config       |
| **Restore**    | Copy file back     | Restore volume, restart container   |
| **Monitor**    | N/A (embedded)     | Container health, API metrics, logs |
| **Update**     | npm update drizzle | Docker image update + migration     |
| **Debug**      | SQL query tools    | EventQL + event replay              |
| **Logs**       | App logs only      | App logs + DB container logs        |
| **Deployment** | Ship app           | Ship app + configure Docker         |

**Operational Overhead:**

- SQLite: ~0 hours/week
- EventSourcingDB: ~2-3 hours/week

---

## Risk Assessment

### Risks of Adopting EventSourcingDB

| Risk                          | Likelihood | Impact   | Mitigation  |
| ----------------------------- | ---------- | -------- | ----------- |
| **Learning curve**            | High       | High     | Don't adopt |
| **Project delays**            | High       | High     | Don't adopt |
| **Maintenance burden**        | High       | Medium   | Don't adopt |
| **Limited community support** | High       | Medium   | Don't adopt |
| **Breaking changes** (v1.5.0) | Medium     | High     | Don't adopt |
| **Wrong abstraction**         | Certain    | Critical | Don't adopt |
| **Increased complexity**      | Certain    | High     | Don't adopt |
| **Additional ops overhead**   | Certain    | Medium   | Don't adopt |

### Risks of Using SQLite

| Risk                       | Likelihood | Impact | Mitigation              |
| -------------------------- | ---------- | ------ | ----------------------- |
| **Single-user limitation** | N/A        | None   | This is single-user app |
| **Data corruption**        | Very Low   | Low    | Regular backups         |
| **Performance issues**     | Very Low   | Low    | Indexes + caching       |

---

## What is EventSourcingDB?

EventSourcingDB is a **separate, standalone database server** specifically
designed for event sourcing patterns.

### Architecture

- **Separate service**: Runs as its own database server (like PostgreSQL or
  MongoDB)
- **Docker-based deployment**: Distributed as a Docker container
- **HTTP API**: Communicates via REST API, not SQL
- **CloudEvents format**: Events must follow the CloudEvents specification
- **Purpose-built**: Designed exclusively for append-only event logs

### Key Features

- Write immutable events to event streams
- Read events chronologically or anti-chronologically
- Query events using EventQL (their custom query language)
- Observe events in real-time (like a message queue)
- Event preconditions (optimistic concurrency control)
- Event schema validation
- Event signing and verification

### Deployment Requirements

- Docker container required
- Separate database server process
- HTTP API endpoint (default port 3000)
- API token authentication
- Additional operational overhead

---

## Detailed Comparison: EventSourcingDB vs SQLite

### 1. Deployment & Operations

| Aspect             | SQLite + Drizzle      | EventSourcingDB               |
| ------------------ | --------------------- | ----------------------------- |
| **Deployment**     | Single file, embedded | Separate Docker container     |
| **Infrastructure** | None                  | Docker runtime required       |
| **Ports**          | None                  | HTTP port (3000)              |
| **Authentication** | N/A (local)           | API tokens                    |
| **Backup**         | Copy one file         | More complex                  |
| **Monitoring**     | Simple                | Additional service to monitor |
| **Development**    | Works immediately     | Need Docker setup             |

**Winner: SQLite** - Zero operational overhead

### 2. Data Model Fit

| Aspect                       | SQLite + Drizzle                             | EventSourcingDB                             |
| ---------------------------- | -------------------------------------------- | ------------------------------------------- |
| **Configuration versioning** | ✅ Temporal table with validFrom/validUntil  | ❌ Would need to model as events (overkill) |
| **Cached calculations**      | ✅ Simple table with invalidatedAt timestamp | ❌ Not an event sourcing use case           |
| **User authentication**      | ✅ Better-auth integration built-in          | ❌ Would need separate database             |
| **Relational queries**       | ✅ SQL with joins, indexes                   | ⚠️ EventQL (limited)                        |
| **Transactions**             | ✅ ACID transactions                         | ⚠️ Event-based (different model)            |

**Winner: SQLite** - Perfect fit for data model

### 3. Integration with Existing Stack

| Aspect             | SQLite + Drizzle                | EventSourcingDB              |
| ------------------ | ------------------------------- | ---------------------------- |
| **Drizzle ORM**    | ✅ Native support               | ❌ Not compatible            |
| **Better-auth**    | ✅ Works out of box             | ❌ Incompatible              |
| **TanStack Query** | ✅ Perfect for SQL queries      | ⚠️ Would work but awkward    |
| **TypeScript**     | ✅ Full type safety via Drizzle | ⚠️ Client SDK available      |
| **Migrations**     | ✅ Drizzle Kit                  | ❌ Different migration model |

**Winner: SQLite** - Seamless integration

### 4. Developer Experience

| Aspect             | SQLite + Drizzle          | EventSourcingDB                |
| ------------------ | ------------------------- | ------------------------------ |
| **Learning curve** | Low (standard SQL)        | High (event sourcing paradigm) |
| **Debugging**      | Standard SQL tools        | EventQL + event replay         |
| **Testing**        | Simple (in-memory SQLite) | TestContainers required        |
| **Documentation**  | Extensive (SQL, Drizzle)  | Limited (new product)          |
| **Community**      | Massive                   | Small (26 GitHub stars)        |

**Winner: SQLite** - Familiar, well-documented

### 5. Performance

| Aspect                | SQLite + Drizzle              | EventSourcingDB          |
| --------------------- | ----------------------------- | ------------------------ |
| **Read performance**  | ✅ Indexed queries, very fast | ❌ Event replay overhead |
| **Write performance** | ✅ Direct writes              | ⚠️ HTTP API overhead     |
| **Latency**           | ✅ Microseconds (local)       | ❌ Network round-trip    |
| **Caching**           | ✅ OS-level + query cache     | ⚠️ Would need app-level  |
| **Scalability**       | ⚠️ Single-user limit          | ✅ Designed for scale    |

**Winner: SQLite** - For single-user app, local is fastest

### 6. Maintenance & Maturity

| Aspect                 | SQLite + Drizzle                      | EventSourcingDB                              |
| ---------------------- | ------------------------------------- | -------------------------------------------- |
| **Maturity**           | ✅ SQLite: 23+ years, Drizzle: proven | ⚠️ EventSourcingDB: released 2025 (< 1 year) |
| **Stability**          | ✅ Rock solid                         | ⚠️ v1.5.0 (still evolving)                   |
| **Breaking changes**   | ✅ Rare                               | ⚠️ Possible (new product)                    |
| **Long-term support**  | ✅ Guaranteed                         | ❓ Unknown                                   |
| **Community adoption** | ✅ Massive                            | ❌ Minimal (26 stars)                        |

**Winner: SQLite** - Battle-tested vs brand new

### 7. Cost & Licensing

| Aspect                  | SQLite + Drizzle                         | EventSourcingDB                 |
| ----------------------- | ---------------------------------------- | ------------------------------- |
| **License**             | ✅ Public domain (SQLite), MIT (Drizzle) | ✅ MIT (client SDK)             |
| **Database license**    | ✅ Free                                  | ❓ Unknown (server is separate) |
| **Infrastructure cost** | ✅ None                                  | ⚠️ Docker resources             |
| **Operational cost**    | ✅ None                                  | ⚠️ Monitoring, updates, etc.    |

**Winner: SQLite** - Zero cost

---

## Migration Impact Assessment

### If You Chose EventSourcingDB (Hypothetical)

**What You'd Need to Rewrite:**

- ❌ All database access code
- ❌ Query patterns (SQL → EventQL + event replay)
- ❌ Data model (tables → event streams)
- ❌ Better-auth integration workarounds
- ❌ Testing approach (need TestContainers)
- ❌ Deployment setup (add Docker)
- ❌ Monitoring and operations

**Estimated Effort:**

- ⏰ 3-4 weeks of development
- 📚 1-2 weeks of learning
- 🔄 Ongoing maintenance overhead

**Benefits Gained:**

- ❌ None (solves problems you don't have)

**Verdict:** ❌ Not worth it

---

## Your Current Architecture is Correct

The temporal configuration table approach (`config_chronic`) is **exactly
right**:

```typescript
{
  id: string,
  userId: string,
  configType: enum('tracked_projects', 'regular_hours', 'client_filter'),
  value: json,
  validFrom: timestamp,      // When this config became active
  validUntil: timestamp | null, // null = current config
  createdAt: timestamp
}
```

### Why This Works Perfectly:

1. **Simple queries** - Get config at any point in time with a WHERE clause
2. **Easy to understand** - Anyone can read the schema
3. **Efficient** - Index on (userId, configType, validFrom, validUntil)
4. **Flexible** - JSON value field handles different config types
5. **No complexity** - No event replay, no event handlers, no additional
   services

### Pattern Name: Temporal Table (aka Slowly Changing Dimension Type 2)

This is a well-known database pattern used by:

- Data warehouses (dimensional modeling)
- Audit systems
- Configuration management
- Historical tracking

**You're using the right pattern for the job.**

---

## Conclusion

The numbers don't lie:

- **Overall Score**: SQLite 10.0 vs EventSourcingDB 3.3
- **Performance**: SQLite 100x - 50,000x faster
- **Complexity**: SQLite minimal vs EventSourcingDB high
- **Operational Overhead**: SQLite 0 hrs/week vs EventSourcingDB 2-3 hrs/week
- **Development Time**: SQLite ready now vs EventSourcingDB +4-6 weeks
- **Fit for Use Case**: SQLite perfect vs EventSourcingDB wrong abstraction

### Final Recommendation

✅ **CONTINUE WITH SQLite + Drizzle ORM**

Your architecture is correct. Your temporal table approach is the right pattern.
EventSourcingDB would be a costly mistake.

**Move forward with confidence!** 🎯

---

## References

- [Temporal Tables Pattern](https://en.wikipedia.org/wiki/Temporal_database)
- [Slowly Changing Dimensions](https://en.wikipedia.org/wiki/Slowly_changing_dimension)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Martin Fowler - Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Microsoft - Event Sourcing Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [EventSourcingDB Docs](https://docs.eventsourcingdb.io/)

---

_Decision completed: 2025-10-31_
