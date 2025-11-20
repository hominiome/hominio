# Zero Sync Architecture - Fullstack Analysis

## ✅ Architecture Status: **CLEAN & CORRECT**

This document provides a comprehensive analysis of the Zero sync architecture implementation across the entire monorepo.

---

## 📐 Architecture Overview

### Data Flow

```
┌─────────────┐
│   Client    │  (services/app)
│  (Browser)  │
└──────┬──────┘
       │ WebSocket
       │ (port 4848)
       ▼
┌─────────────────┐
│  zero-cache     │  (services/sync)
│  (zero-cache-dev)│
└──────┬──────────┘
       │ HTTP (with cookies)
       │ get-queries & push
       ▼
┌─────────────────┐
│   API Service   │  (services/api)
│   (port 4204)   │
└──────┬──────────┘
       │ SQL
       ▼
┌─────────────────┐
│   PostgreSQL    │
│  (Zero DB)      │
└─────────────────┘
```

### Service Responsibilities

1. **`services/app`** (Frontend)
   - Zero client connects to `zero-cache` via WebSocket
   - Uses synced queries for reads (`allProjects`)
   - Uses custom mutators for writes (optimistic updates)
   - Cookie-based authentication (BetterAuth)

2. **`services/sync`** (Zero Cache)
   - Runs `zero-cache-dev` process
   - Connects to PostgreSQL via logical replication
   - Exposes WebSocket on port 4848
   - Forwards cookies to API service for auth

3. **`services/api`** (Backend API)
   - Handles `/api/v0/zero/get-queries` (synced queries)
   - Handles `/api/v0/zero/push` (custom mutators)
   - Validates permissions server-side
   - Uses cookie-based auth (delegates to wallet service)

4. **`libs/hominio-zero`** (Shared Library)
   - **Single source of truth** for Zero configuration
   - Schema definitions
   - Client mutators (optimistic updates)
   - Synced query definitions
   - Used by all services

---

## 📦 Shared Library: `libs/hominio-zero`

### Structure

```
libs/hominio-zero/
├── package.json          # @hominio/zero workspace dependency
├── src/
│   ├── index.ts          # Main exports
│   ├── schema.ts         # Zero schema (projects table only)
│   ├── mutators.ts       # Client-side mutators (optimistic)
│   └── synced-queries.ts # Synced query definitions
```

### ✅ Key Features

1. **Single Source of Truth**
   - Schema defined once in `schema.ts`
   - Used by sync service (via `--schema-path`)
   - Used by API service (imports)
   - Used by app service (imports)

2. **Clean Separation**
   - Client mutators: Optimistic updates, basic validation
   - Server mutators: Permission checks (in `services/api`)
   - Synced queries: Client-side query definitions

3. **No Duplicates**
   - ✅ No `zero-schema.ts` files in services
   - ✅ No duplicate `mutators.ts` files
   - ✅ All services import from `@hominio/zero`

---

## 🔄 Sync Service (`services/sync`)

### Configuration

**File:** `services/sync/scripts/dev.js`

```javascript
// Uses shared schema from @hominio/zero library
zero-cache-dev \
  --schema-path=../../libs/hominio-zero/src/schema.ts \
  --get-queries-url=http://localhost:4204/api/v0/zero/get-queries \
  --push-url=http://localhost:4204/api/v0/zero/push \
  --get-queries-forward-cookies \
  --mutate-forward-cookies
```

### ✅ Correct Implementation

- ✅ Uses shared schema via `--schema-path`
- ✅ No duplicate schema file
- ✅ Forwards cookies for authentication
- ✅ Points to correct API endpoints

### Dependencies

```json
{
  "dependencies": {
    "@hominio/zero": "workspace:*",
    "@rocicorp/zero": "^0.24.0"
  }
}
```

---

## 🔌 API Service (`services/api`)

### Endpoints

#### 1. Get Queries (`/api/v0/zero/get-queries`)

**File:** `services/api/src/routes/v0/zero/get-queries.ts`

```typescript
import { schema, builder } from '@hominio/zero';

function getQuery(name: string, args: readonly ReadonlyJSONValue[]) {
    if (name === 'allProjects') {
        return {
            query: builder.project.orderBy('createdAt', 'desc'),
        };
    }
    throw new Error(`No such query: ${name}`);
}
```

**✅ Correct Implementation:**
- ✅ Imports schema from `@hominio/zero`
- ✅ Uses shared `builder` for queries
- ✅ Extracts auth data from cookies
- ✅ Only handles `allProjects` query (projects-only scope)

#### 2. Push (`/api/v0/zero/push`)

**File:** `services/api/src/routes/v0/zero/push.ts`

```typescript
import { schema, createMutators } from '@hominio/zero';
import { createServerMutators } from '../../../lib/mutators.server';

// Extract auth from cookies
const authData = await extractAuthData(request);

// Create client mutators (reused)
const clientMutators = createMutators(authData);

// Create server mutators with permission checks
const serverMutators = createServerMutators(authData, clientMutators);

// Process push request
const result = await pushProcessor.process(serverMutators, request);
```

**✅ Correct Implementation:**
- ✅ Imports schema and mutators from `@hominio/zero`
- ✅ Wraps client mutators with server-side permission checks
- ✅ Uses cookie-based authentication
- ✅ Delegates to shared mutators (DRY)

### Server Mutators

**File:** `services/api/src/lib/mutators.server.ts`

```typescript
import { createMutators } from '@hominio/zero';

export function createServerMutators(authData, clientMutators) {
    return {
        project: {
            create: async (tx, args) => {
                // Permission check: authenticated user
                if (!authData?.sub) {
                    throw new Error('Unauthorized');
                }
                // Delegate to client mutator
                await clientMutators.project.create(tx, args);
            },
            // ... update, delete
        }
    };
}
```

**✅ Correct Implementation:**
- ✅ Imports client mutators from `@hominio/zero`
- ✅ Adds server-side permission checks
- ✅ Delegates to shared mutators (no duplication)
- ✅ Clean separation: client = optimistic, server = security

### Dependencies

```json
{
  "dependencies": {
    "@hominio/zero": "workspace:*",
    "@rocicorp/zero": "^0.24.0"
  }
}
```

---

## 🎨 App Service (`services/app`)

### Zero Client Initialization

**File:** `services/app/src/routes/+layout.svelte`

```typescript
import { schema, createMutators } from '@hominio/zero';

zero = new Zero({
    server: zeroServerUrl, // http://localhost:4848 (dev)
    schema,
    userID: userId,
    mutators: createMutators(undefined),
    getQueriesURL: `${apiUrl}/api/v0/zero/get-queries`,
    mutateURL: `${apiUrl}/api/v0/zero/push`,
    // NO AUTH FUNCTION - cookie-based auth only
});
```

**✅ Correct Implementation:**
- ✅ Imports schema and mutators from `@hominio/zero`
- ✅ Connects to zero-cache WebSocket
- ✅ Configures get-queries and push endpoints
- ✅ Uses cookie-based auth (no auth function)
- ✅ Provides Zero context to child components

### Using Synced Queries

**File:** `services/app/src/routes/me/+page.svelte`

```typescript
import { allProjects } from '@hominio/zero';

const projectsQuery = allProjects();
projectsView = zero.materialize(projectsQuery);

projectsView.addListener((data) => {
    projects = Array.from(data || []);
    loading = false;
});
```

**✅ Correct Implementation:**
- ✅ Imports synced query from `@hominio/zero`
- ✅ Uses `zero.materialize()` for reactive data
- ✅ Listens for updates via `addListener()`
- ✅ Clean, reactive UI updates

### Dependencies

```json
{
  "dependencies": {
    "@hominio/zero": "workspace:*",
    "@rocicorp/zero": "^0.24.0"
  }
}
```

---

## 🔐 Authentication Flow

### Cookie-Based Auth (BetterAuth)

1. **Client** → Logs in via `wallet` service
2. **Wallet** → Sets session cookie
3. **Client** → Connects to Zero with cookie
4. **zero-cache** → Forwards cookie to API service
5. **API** → Extracts auth data from cookie (delegates to wallet)
6. **API** → Validates permissions server-side

**✅ Correct Implementation:**
- ✅ No auth function in Zero client
- ✅ Cookies automatically forwarded by zero-cache
- ✅ API service extracts auth from cookies
- ✅ Server-side permission checks

---

## ✅ Architecture Checklist

### Single Source of Truth
- ✅ Schema: `libs/hominio-zero/src/schema.ts`
- ✅ Client Mutators: `libs/hominio-zero/src/mutators.ts`
- ✅ Synced Queries: `libs/hominio-zero/src/synced-queries.ts`
- ✅ No duplicate files in services

### Service Dependencies
- ✅ `services/sync`: Uses shared schema via `--schema-path`
- ✅ `services/api`: Imports from `@hominio/zero`
- ✅ `services/app`: Imports from `@hominio/zero`

### Data Flow
- ✅ Client → zero-cache (WebSocket)
- ✅ zero-cache → API (HTTP with cookies)
- ✅ API → PostgreSQL (SQL)

### Authentication
- ✅ Cookie-based (BetterAuth)
- ✅ Cookies forwarded by zero-cache
- ✅ Server-side permission checks

### Query Flow
- ✅ Client: `allProjects()` synced query
- ✅ zero-cache: Forwards to API `/get-queries`
- ✅ API: Implements query using shared `builder`
- ✅ Returns data → zero-cache → client

### Mutation Flow
- ✅ Client: Calls mutator (optimistic update)
- ✅ zero-cache: Forwards to API `/push`
- ✅ API: Validates permissions, executes mutator
- ✅ Result synced back to all clients

---

## 🎯 Summary

### ✅ **Architecture is CLEAN and CORRECT**

1. **Single Source of Truth**: All Zero config in `libs/hominio-zero`
2. **No Duplication**: No duplicate schema/mutator files
3. **Proper Separation**: Client mutators (optimistic) vs Server mutators (security)
4. **Correct Data Flow**: Client → zero-cache → API → PostgreSQL
5. **Cookie-Based Auth**: Properly implemented with forwarding
6. **Clean Imports**: All services use `@hominio/zero` workspace dependency

### 📊 Current Scope

- **Projects Only**: Clean slate implementation
- **Single Table**: `project` table only
- **Single Query**: `allProjects` synced query
- **Three Mutators**: `create`, `update`, `delete`

### 🚀 Ready for Extension

The architecture is ready to extend:
- Add new tables to `schema.ts`
- Add new mutators to `mutators.ts`
- Add new synced queries to `synced-queries.ts`
- All services automatically get updates via workspace dependency

---

## 📝 Files Reference

### Shared Library
- `libs/hominio-zero/src/schema.ts` - Schema definition
- `libs/hominio-zero/src/mutators.ts` - Client mutators
- `libs/hominio-zero/src/synced-queries.ts` - Synced queries
- `libs/hominio-zero/src/index.ts` - Exports

### Sync Service
- `services/sync/scripts/dev.js` - zero-cache-dev config
- `services/sync/scripts/zero-migrate.js` - Database migration

### API Service
- `services/api/src/routes/v0/zero/get-queries.ts` - Query handler
- `services/api/src/routes/v0/zero/push.ts` - Mutation handler
- `services/api/src/lib/mutators.server.ts` - Server mutators with permissions

### App Service
- `services/app/src/routes/+layout.svelte` - Zero client initialization
- `services/app/src/routes/me/+page.svelte` - Projects list using synced query
- `services/app/src/lib/zero-utils.ts` - Zero context utilities

---

**Last Updated:** 2025-01-XX  
**Status:** ✅ Production Ready

