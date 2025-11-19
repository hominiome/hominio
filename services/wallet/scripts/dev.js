#!/usr/bin/env bun
/**
 * Dev script for wallet service
 * Runs BetterAuth migrations before starting the dev server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Wallet service directory
const walletDir = join(__dirname, '..');

// Read environment variables (Bun passes them via --env-file)
const WALLET_POSTGRES_SECRET = process.env.WALLET_POSTGRES_SECRET;

// Check required env vars
if (!WALLET_POSTGRES_SECRET) {
  console.error('❌ WALLET_POSTGRES_SECRET environment variable is required');
  process.exit(1);
}

/**
 * Main function - runs migration then starts dev server
 */
async function main() {
  // Step 1: Run migration before starting dev server
  // Use BetterAuth CLI migration (same as production) for consistency
  console.log('🔄 [Wallet] Running BetterAuth database migration...');
  const migrateProcess = spawn('bun', ['run', 'migrate:auth'], {
    cwd: walletDir,
    env: process.env,
    stdio: 'inherit',
  });

  // Wait for migration to complete before starting dev server
  await new Promise((resolve, reject) => {
    migrateProcess.on('exit', (code) => {
      if (code === 0 || code === null) {
        console.log('✅ [Wallet] Migration completed successfully\n');
        resolve();
      } else {
        console.error(`❌ [Wallet] Migration failed with code ${code}`);
        reject(new Error(`Migration failed with code ${code}`));
      }
    });
    migrateProcess.on('error', (error) => {
      console.error('❌ [Wallet] Migration error:', error);
      reject(error);
    });
  });

  // Step 2: Start dev server after migration completes
  console.log('🚀 [Wallet] Starting dev server...');
  console.log(`   Database: ${WALLET_POSTGRES_SECRET.substring(0, 30)}...\n`);

  const devServer = spawn('bunx', ['vite', 'dev'], {
    cwd: walletDir,
    env: process.env,
    stdio: 'inherit',
  });

  // Handle process exit
  devServer.on('exit', (code) => {
    process.exit(code || 0);
  });

  // Handle errors
  devServer.on('error', (error) => {
    console.error('❌ [Wallet] Failed to start dev server:', error.message);
    process.exit(1);
  });

  // Handle signals
  process.on('SIGINT', () => {
    devServer.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    devServer.kill('SIGTERM');
  });
}

// Run main function
main().catch((error) => {
  console.error('❌ [Wallet] Fatal error:', error);
  process.exit(1);
});

