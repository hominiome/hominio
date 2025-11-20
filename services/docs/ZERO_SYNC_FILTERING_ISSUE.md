# Zero Sync Filtering Issue - Root Cause Analysis

## The Problem

**Zero sync uses PostgreSQL logical replication**, which means:
1. `zero-cache-dev` syncs ALL rows directly from PostgreSQL via logical replication
2. The API's `get-queries` filtering happens AFTER data is already synced
3. Client reads from `zero-cache-dev`'s cache, which contains ALL unfiltered data

## Why Filtering Doesn't Work

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ Reads from cache
       ▼
┌─────────────────┐
│ zero-cache-dev  │ ◄─── PostgreSQL Logical Replication (ALL DATA)
│  (Port 4848)    │      (Bypasses API filtering!)
└────────┬────────┘
         │ Calls get-queries (only for query definition)
         ▼
┌─────────────────┐
│  API Service    │
│  (Port 4204)    │
│  get-queries    │ ◄─── Filters here, but too late!
└─────────────────┘
```

**The issue**: Logical replication syncs ALL rows from PostgreSQL BEFORE the API can filter them.

## Solutions

### Option 1: PostgreSQL Row Level Security (RLS) ✅ RECOMMENDED

Filter at the database level using PostgreSQL RLS policies. This ensures `zero-cache-dev` only syncs data the user should see.

**Implementation:**
1. Enable RLS on the `project` table
2. Create RLS policies based on `ownedBy` and capabilities
3. Set the current user context for each replication connection

**Pros:**
- Filters at the source (database)
- Works with logical replication
- Most secure approach

**Cons:**
- Requires PostgreSQL RLS setup
- Need to set user context for replication

### Option 2: Filter in Zero View-Syncers

Use Zero's view-syncers to filter data after replication but before client access.

**Pros:**
- Works with existing Zero architecture
- Can use capability checks

**Cons:**
- Still syncs all data (wasteful)
- More complex setup

### Option 3: Disable Logical Replication, Use get-queries Only

Don't use logical replication - only sync via `get-queries` responses.

**Pros:**
- Simple - filtering already works
- No RLS needed

**Cons:**
- Loses real-time sync benefits
- Slower performance
- Not how Zero is designed to work

## Recommended Solution: PostgreSQL RLS

We need to:
1. Enable RLS on `project` table
2. Create policy: Users can only see projects they own OR have read capability for
3. Set user context in replication connection (via `SET ROLE` or `SET SESSION`)

However, **logical replication doesn't support per-user filtering** - it replicates ALL data to all subscribers.

## The Real Solution: Filter in get-queries AND Use Zero's Filtering

Zero's `get-queries` should return filtered results, and Zero should use those filtered results instead of raw replication data. But if Zero is using logical replication, it gets ALL data.

**Actual Fix**: We need to ensure Zero uses the filtered results from `get-queries`, not the raw replication data. This might require:
- Configuring Zero to prefer `get-queries` results over replication
- Or using Zero's view-syncers to filter replication data

## Immediate Fix: Check Zero Configuration

The issue might be that Zero is configured to use replication for data but `get-queries` for queries. We need to ensure `get-queries` filtering is actually being used.

Let me check the Zero configuration and see if we can force it to use filtered results.

