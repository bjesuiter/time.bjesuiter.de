# time.bjesuiter.de

A simple time tracking dashboard.

---

## Mission & Goals

### The Problem

Manual overtime tracking is tedious and error-prone when using Clockify for time
tracking. While Clockify excels at capturing time entries, it lacks customized
views for:

- Tracking specific project progress across weekly timelines
- Calculating overtime based on configurable work hour baselines
- Maintaining historical context of what was being tracked at any given time

### The Solution

An automated dashboard that connects to Clockify and provides:

**Weekly Time Tables**

- Visual representation of work weeks (Monday through Sunday)
- Each day shows total hours logged for **selected projects** (e.g., "SMC 1.8:
  Weiterentwicklung")
- Multiple tables for different time periods
- Projects used for daily calculations are configurable (changes per release,
  e.g., SMC 1.8 → SMC 1.9)

**Overtime Counter**

- Shows plus/minus hours for the week compared to baseline (default: 25
  hours/week)
- Calculates based on **all projects under a client** (e.g., all "secunet"
  projects)
- Cumulative overtime tracking
- Configurable baseline work hours

**Dynamic Configuration with History**

- Configuration changes are versioned and timestamped
- Can answer: "What projects were tracked on date X?"
- Can answer: "What was the regular hours baseline on date X?"
- Essential for accurate historical overtime calculations

**Seamless Integration**

- One-time setup flow for Clockify API key and workspace selection
- Secure authentication with Better-auth (email-based)
- SQLite database for local data storage and caching

### Key Features

1. **Clockify Integration**
   - Validates API keys via Clockify user endpoint
   - Fetches time summaries via Clockify reports API
   - Workspace selection during setup

2. **Smart Data Display**
   - Daily columns: Sum of **configured project(s)** time entries
   - Weekly totals: Sum of **all client projects** for overtime calculation
   - Cached calculations to avoid repeated API calls

3. **Historical Configuration Tracking**
   - All configuration changes are preserved with timestamps
   - Projects to track
   - Regular work hours baseline
   - Client filter

4. **Performance Optimization**
   - Pre-calculated daily and weekly sums
   - Cached data with intelligent invalidation
   - Research: Event Sourcing pattern for calculation management

---

## Project Structure

### Server-Only Code Pattern

This project follows a strict separation between server and client code to prevent server-only modules (database, environment variables) from being bundled for the browser.

**Key Principle**: Server-only modules (`envStore`, `db`, `auth`) are ONLY imported in `src/server/` files.

#### Directory Organization

```
src/
├── server/       # Server functions - safe to import envStore, db, auth
├── routes/       # Route components - NEVER import server-only modules directly
├── components/   # React components - client-safe only
├── client/       # Client-side utilities (auth-client)
├── db/           # Database schemas and instance (server-only)
└── lib/
    ├── auth/     # Auth configuration (server-only)
    └── env/      # Environment variables (server-only)
```

#### Example Pattern

**✅ Correct**: Server function in `src/server/`

```typescript
// src/server/myServerFns.ts
import { createServerFn } from "@tanstack/react-start";
import { envStore } from "@/lib/env/envStore";  // ✅ Safe
import { db } from "@/db";                       // ✅ Safe

export const getData = createServerFn({ method: "GET" })
    .handler(async () => {
        // Use server-only modules freely
        const data = await db.query.myTable.findFirst();
        return data;
    });
```

**✅ Correct**: Route imports server function only

```typescript
// src/routes/myroute.tsx
import { createFileRoute } from '@tanstack/react-router'
import { getData } from '@/server/myServerFns'  // ✅ Safe

export const Route = createFileRoute('/myroute')({
  loader: async () => await getData(),
  component: MyComponent,
})
```

**❌ Wrong**: Route imports server-only modules

```typescript
// ❌ DON'T DO THIS
import { envStore } from '@/lib/env/envStore'  // ❌ Will run on client!
```

---

# Repo Log

## 2025-10-22 Initial Setup

```bash
bun create @tanstack/start@latest

bun create @tanstack/start@latest
┌  Let's configure your TanStack Start application
│
◇  What would you like to name your project?
│  time.bjesuiter.de
│
◇  Would you like to use Tailwind CSS?
│  Yes
│
◇  Select toolchain
│  None
│
◇  What add-ons would you like for your project?
│  Query
│
◇  Would you like any examples?
│  none
│
◇  Initialized git repository
│
◇  Installed dependencies
│
└  Your TanStack Start app is ready in 'time.bjesuiter.de'.

Use the following commands to start your app:
% cd time.bjesuiter.de
% bun --bun run dev
```
