/**
 * Database utilities
 * Centralized database connection management
 */

import { Pool } from "pg";

// Zero sync database pool (for Zero operations)
let zeroDbPool: Pool | null = null;

/**
 * Get Zero sync database pool
 * Uses ZERO_POSTGRES_SECRET connection string (non-pooler)
 * Falls back to SECRET_ZERO_DEV_PG for backward compatibility
 */
export function getZeroDbPool(): Pool {
  if (!zeroDbPool) {
    const connectionString = process.env.ZERO_POSTGRES_SECRET || process.env.SECRET_ZERO_DEV_PG;
    if (!connectionString) {
      throw new Error("ZERO_POSTGRES_SECRET (or SECRET_ZERO_DEV_PG) environment variable is required");
    }
    zeroDbPool = new Pool({
      connectionString,
      // Connection pool settings
      max: 10, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
    });
  }
  return zeroDbPool;
}

