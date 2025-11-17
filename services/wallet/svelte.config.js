import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// Use PORT environment variable (defaults to 3000)
			// This ensures Fly.io can route traffic correctly
		})
	}
};

export default config;
