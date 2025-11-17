#!/usr/bin/env bun

/**
 * Development script that runs all three services in parallel
 * with proper process management, cleanup, and error handling.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Track all child processes
const processes = [];

// Service configuration
const services = [
	{ name: 'website', filter: 'website', port: 4200 },
	{ name: 'wallet', filter: 'wallet', port: 4201 },
	{ name: 'app', filter: 'app', port: 4202 },
];

/**
 * Start a service as a child process
 */
function startService(service) {
	console.log(`[${service.name}] Starting on port ${service.port}...`);

	const childProcess = spawn('bun', ['--env-file=.env', '--filter', service.filter, 'dev'], {
		cwd: rootDir,
		stdio: 'inherit',
		shell: false,
		env: { ...process.env },
	});

	// Tag the process with service name for easier identification
	childProcess.serviceName = service.name;
	childProcess.servicePort = service.port;

	// Handle process errors
	childProcess.on('error', (error) => {
		console.error(`[${service.name}] Failed to start:`, error.message);
		shutdown(1);
	});

	// Handle process exit
	childProcess.on('exit', (code, signal) => {
		if (code !== 0 && code !== null) {
			console.error(`[${service.name}] Exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`);
			// If a service crashes, shut down all others
			shutdown(code || 1);
		}
	});

	processes.push(childProcess);
	return childProcess;
}

/**
 * Shutdown all processes gracefully
 */
function shutdown(exitCode = 0) {
	console.log('\n[Dev] Shutting down all services...');

	// Kill all child processes
	processes.forEach((proc) => {
		if (proc && !proc.killed) {
			try {
				// Try graceful shutdown first (SIGTERM)
				proc.kill('SIGTERM');

				// Force kill after 2 seconds if still running
				setTimeout(() => {
					if (proc && !proc.killed) {
						console.log(`[${proc.serviceName}] Force killing...`);
						proc.kill('SIGKILL');
					}
				}, 2000);
			} catch (error) {
				console.error(`[${proc.serviceName}] Error killing process:`, error.message);
			}
		}
	});

	// Wait a bit for processes to clean up, then exit
	setTimeout(() => {
		process.exit(exitCode);
	}, 500);
}

/**
 * Setup signal handlers for graceful shutdown
 */
function setupSignalHandlers() {
	// Handle Ctrl+C (SIGINT)
	process.on('SIGINT', () => {
		console.log('\n[Dev] Received SIGINT, shutting down...');
		shutdown(0);
	});

	// Handle termination signal (SIGTERM)
	process.on('SIGTERM', () => {
		console.log('\n[Dev] Received SIGTERM, shutting down...');
		shutdown(0);
	});

	// Handle uncaught exceptions
	process.on('uncaughtException', (error) => {
		console.error('[Dev] Uncaught exception:', error);
		shutdown(1);
	});

	// Handle unhandled promise rejections
	process.on('unhandledRejection', (reason, promise) => {
		console.error('[Dev] Unhandled rejection at:', promise, 'reason:', reason);
		shutdown(1);
	});
}

/**
 * Main execution
 */
function main() {
	console.log('[Dev] Starting all services...\n');
	console.log('Press Ctrl+C to stop all services\n');

	setupSignalHandlers();

	// Start all services
	services.forEach((service) => {
		startService(service);
	});

	// Keep the script running
	process.stdin.resume();
}

// Run main
main();

