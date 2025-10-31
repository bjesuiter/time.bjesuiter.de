# Agent Guidelines

This document contains guidelines for AI agents working on this codebase.

---

## Development Workflow

### Use Package.json Scripts

Always use the predefined scripts from `package.json` rather than custom
commands:

- `bun run dev` - Start development server on port 3000
- `bun run build` - Build for production
- `bun run serve` - Preview production build
- `bun run test` - Run tests with vitest
- `bun run dbpush` - Push database schema changes (Drizzle Kit)
- `bun run dbstudio` - Open Drizzle Studio for database management
- `bun run auth-schema` - Generate Better-auth schema file

---

## Architecture Decision Records

### Logging Decisions

Document all significant architectural decisions in `agent/decisions/` following
this template:

**Filename Format**: `YYYY_MM_DD_topic_description.md`

**Examples**:

- `2025_10_31_better_auth_integration.md`
- `2025_10_31_eventsourcingdb_vs_sqlite.md`
- `2025_11_15_api_rate_limiting_strategy.md`

### Keep ARCHITECTURE.md Concise

The `agent/ARCHITECTURE.md` file should remain a high-level overview. Move
detailed decision rationale, alternatives considered, and implementation
specifics into separate decision files in `agent/decisions/`.

---
