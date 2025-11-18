#!/usr/bin/env bun
/**
 * Dev script for Zero sync service
 * Sets up environment variables and runs zero-cache-dev
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Sync service directory (where zero-schema.ts is located)
const syncDir = join(__dirname, '..');
// Root directory (for env file access)
const rootDir = join(__dirname, '../../..');

// Read environment variables (Bun passes them via --env-file)
// Support both new name (ZERO_POSTGRES_SECRET) and old name (SECRET_ZERO_DEV_PG) for backward compatibility
const ZERO_POSTGRES_SECRET = process.env.ZERO_POSTGRES_SECRET || process.env.SECRET_ZERO_DEV_PG;
const AUTH_SECRET = process.env.AUTH_SECRET;
const ZERO_AUTH_SECRET = process.env.ZERO_AUTH_SECRET || AUTH_SECRET;

// Set up environment for zero-cache-dev
const env = {
  ...process.env,
  // Map ZERO_POSTGRES_SECRET to ZERO_UPSTREAM_DB (zero-cache-dev expects this)
  ZERO_UPSTREAM_DB: ZERO_POSTGRES_SECRET || process.env.ZERO_UPSTREAM_DB,
  // Set local dev URLs (API service runs on port 4204)
  ZERO_GET_QUERIES_URL: process.env.ZERO_GET_QUERIES_URL || 'http://localhost:4204/api/v0/zero/get-queries',
  ZERO_PUSH_URL: process.env.ZERO_PUSH_URL || 'http://localhost:4204/api/v0/zero/push',
  // Set cookie forwarding (required for Better Auth)
  ZERO_GET_QUERIES_FORWARD_COOKIES: process.env.ZERO_GET_QUERIES_FORWARD_COOKIES || 'true',
  ZERO_MUTATE_FORWARD_COOKIES: process.env.ZERO_MUTATE_FORWARD_COOKIES || 'true',
  // Set auth secret (for admin password and JWT)
  ZERO_AUTH_SECRET: ZERO_AUTH_SECRET,
  // Set replica file location (local dev)
  ZERO_REPLICA_FILE: process.env.ZERO_REPLICA_FILE || './zero-replica.db',
};

// Check required env vars
if (!env.ZERO_UPSTREAM_DB) {
  console.error('❌ ZERO_POSTGRES_SECRET (or SECRET_ZERO_DEV_PG or ZERO_UPSTREAM_DB) environment variable is required');
  process.exit(1);
}

if (!env.ZERO_AUTH_SECRET) {
  console.error('❌ AUTH_SECRET or ZERO_AUTH_SECRET environment variable is required');
  process.exit(1);
}

/**
 * Main function - runs migration then starts zero-cache-dev
 */
async function main() {
  // Step 1: Run migration before starting zero-cache-dev
  console.log('🔄 [Sync] Running Zero database migration...');
  const migrateProcess = spawn('bun', ['run', 'scripts/zero-migrate.js'], {
    cwd: syncDir,
    env,
    stdio: 'inherit',
  });

  // Wait for migration to complete before starting zero-cache-dev
  await new Promise((resolve, reject) => {
    migrateProcess.on('exit', (code) => {
      if (code === 0 || code === null) {
        console.log('✅ [Sync] Migration completed successfully\n');
        resolve();
      } else {
        console.error(`❌ [Sync] Migration failed with code ${code}`);
        reject(new Error(`Migration failed with code ${code}`));
      }
    });
    migrateProcess.on('error', (error) => {
      console.error('❌ [Sync] Migration error:', error);
      reject(error);
    });
  });

  // Step 2: Start zero-cache-dev after migration completes
  console.log('🚀 [Sync] Starting zero-cache-dev...');
  console.log(`   Database: ${env.ZERO_UPSTREAM_DB.substring(0, 30)}...`);
  console.log(`   Get Queries URL: ${env.ZERO_GET_QUERIES_URL}`);
  console.log(`   Push URL: ${env.ZERO_PUSH_URL}\n`);

  // Spawn zero-cache-dev using npx to ensure proper native module resolution
  // Run from sync service directory where zero-schema.ts is located
  const zeroCacheDev = spawn(
    'npx',
    [
      'zero-cache-dev',
      '--schema-path=./zero-schema.ts',
      `--admin-password=${env.ZERO_AUTH_SECRET}`,
      '--mutate-forward-cookies',
      '--get-queries-forward-cookies',
      '--log-level=error',
      '--port=4848',
    ],
    {
      cwd: syncDir, // Run from sync service directory
      env,
      stdio: 'inherit',
    }
  );

  // Handle process exit
  zeroCacheDev.on('exit', (code) => {
    process.exit(code || 0);
  });

  // Handle errors
  zeroCacheDev.on('error', (error) => {
    console.error('❌ [Sync] Failed to start zero-cache-dev:', error.message);
    console.error('   Make sure zero-cache-dev is installed: bun install');
    process.exit(1);
  });

  // Handle signals
  process.on('SIGINT', () => {
    zeroCacheDev.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    zeroCacheDev.kill('SIGTERM');
  });
}

// Run main function
main().catch((error) => {
  console.error('❌ [Sync] Fatal error:', error);
  process.exit(1);
});

