import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		devtoolsJson()
	],
	// Load env vars from monorepo root
	envDir: resolve(__dirname, '../..'),
	envPrefix: ['PUBLIC_', 'WALLET_', 'AUTH_', 'GOOGLE_', 'POLAR_', 'NEON_'],
	server: {
		port: process.env.PORT ? Number(process.env.PORT) : 4201,
		strictPort: true,
	},
	resolve: {
		// Ensure proper module resolution in monorepo
		preserveSymlinks: false,
	},
});
