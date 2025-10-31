# Agent Documentation

This folder contains architecture documentation and decision records for the time tracking application.

---

## File Structure

```
agent/
├── README.md                  # This file
├── ARCHITECTURE.md            # Main architecture document (concise, for LLM context)
└── decisions/                 # Detailed decision discussions and research
    ├── 2025_10_31_eventsourcingdb_vs_sqlite.md
    └── 2025_10_31_better_auth_integration.md
```

---

## Documents

### ARCHITECTURE.md

**Purpose**: Concise architecture overview optimized for LLM context

**Contents**:
- Technology stack
- Database schema
- Configuration versioning strategy
- Cache invalidation strategy
- Better-auth integration
- Implementation phases
- Technical decisions (summary with references)

**When to use**: 
- As context for LLM coding assistants
- Quick reference for architecture decisions
- Onboarding new developers

**What's NOT here**:
- Detailed decision discussions → See `decisions/`
- Usage examples → See `decisions/`
- Research details → See `decisions/`

---

### decisions/

**Purpose**: Detailed decision discussions, research, and usage examples

**Naming convention**: `YYYY_MM_DD_descriptive_topic_name.md`

**Current decisions**:

1. **`2025_10_31_eventsourcingdb_vs_sqlite.md`**
   - Decision: SQLite + Drizzle ORM vs EventSourcingDB
   - Status: ✅ DECIDED - Continue with SQLite
   - Contains: Comprehensive comparison, scoring matrix, performance analysis, usage examples
   
2. **`2025_10_31_better_auth_integration.md`**
   - Decision: Better-auth integration approach
   - Status: ✅ IMPLEMENTED
   - Contains: Schema details, configuration examples, usage patterns, security considerations

---

## Adding New Decisions

When documenting a new decision:

1. **Create a new file**: `decisions/YYYY_MM_DD_topic_name.md`

2. **Use this template**:
   ```markdown
   # Decision: [Title]
   
   **Date**: YYYY-MM-DD
   **Status**: [🔍 Research | ⚖️ Evaluating | ✅ DECIDED | ❌ REJECTED | 🔄 REVISIT]
   
   ---
   
   ## TL;DR
   
   [One-paragraph summary of the decision]
   
   ---
   
   ## Decision Summary
   
   [What was decided and why]
   
   ---
   
   ## Context
   
   [Background and motivation]
   
   ---
   
   ## Options Considered
   
   ### Option 1: [Name]
   **Pros:**
   **Cons:**
   
   ### Option 2: [Name]
   **Pros:**
   **Cons:**
   
   ---
   
   ## Decision
   
   [Final decision with rationale]
   
   ---
   
   ## Usage Examples
   
   [Code examples and patterns]
   
   ---
   
   ## References
   
   [Links and related documents]
   ```

3. **Update ARCHITECTURE.md**: Add reference to the decision file

4. **Use clear names**: Make it easy to find decisions later
   - Good: `2025_10_31_cache_strategy_redis_vs_sqlite.md`
   - Bad: `decision.md`, `temp.md`, `notes.md`

---

## Philosophy

### Keep ARCHITECTURE.md Concise

The main architecture document should be:
- ✅ Easy to read in one sitting
- ✅ Optimized for LLM context windows
- ✅ High-level overview with references to details
- ❌ NOT filled with long discussions
- ❌ NOT containing all research details

### Put Details in decisions/

Decision files should contain:
- ✅ Comprehensive research and analysis
- ✅ Usage examples and code snippets
- ✅ Detailed comparisons and scoring
- ✅ All context needed to understand the decision
- ✅ Can be as long as needed

### Benefits of This Approach

1. **LLM-friendly**: Concise architecture doc fits easily in context
2. **Searchable**: Decisions organized by date and topic
3. **Complete**: No loss of detail, just better organized
4. **Maintainable**: Easy to update main doc without losing history
5. **Clear**: Separation of overview vs deep-dive content

---

## Document Status Legend

- 🔍 **Research** - Gathering information
- ⚖️ **Evaluating** - Comparing options
- ✅ **DECIDED** - Decision made and documented
- ❌ **REJECTED** - Option explicitly rejected
- 🔄 **REVISIT** - Needs review in future

---

_Last updated: 2025-10-31_

