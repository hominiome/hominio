<script lang="ts">
	import '@hominio/brand/app.css';
	import { Footer, Favicon, NavPill } from '@hominio/brand';
	import { createAuthClient } from '@hominio/auth';
	import { browser } from '$app/environment';
	import { env as publicEnv } from '$env/dynamic/public';

	let { children } = $props();

	// Use BetterAuth's reactive session hook (client-side only)
	const authClient = createAuthClient();
	const session = authClient.useSession();

	// Get wallet domain for sign-in redirect
	function getWalletUrl(): string {
		if (!browser) return '';
		
		const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.0.0.1');
		let walletDomain = publicEnv.PUBLIC_DOMAIN_WALLET;
		
		if (!walletDomain) {
			if (isProduction) {
				const hostname = window.location.hostname;
				if (hostname.startsWith('www.')) {
					walletDomain = hostname.replace('www.', 'wallet.');
				} else {
					walletDomain = `wallet.${hostname}`;
				}
			} else {
				walletDomain = 'localhost:4201';
			}
		}
		
		walletDomain = walletDomain.replace(/^https?:\/\//, '');
		const protocol = walletDomain.startsWith('localhost') || walletDomain.startsWith('127.0.0.1') ? 'http' : 'https';
		return `${protocol}://${walletDomain}`;
	}

	// Get app service URL
	function getAppUrl(): string {
		if (!browser) return '';
		
		const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.0.0.1');
		let appDomain = publicEnv.PUBLIC_DOMAIN_APP;
		
		if (!appDomain) {
			if (isProduction) {
				const hostname = window.location.hostname;
				if (hostname.startsWith('www.')) {
					appDomain = hostname.replace('www.', 'app.');
				} else if (hostname.startsWith('website.')) {
					appDomain = hostname.replace('website.', 'app.');
				} else {
					appDomain = `app.${hostname}`;
				}
			} else {
				appDomain = 'localhost:4202';
			}
		}
		
		appDomain = appDomain.replace(/^https?:\/\//, '');
		const protocol = appDomain.startsWith('localhost') || appDomain.startsWith('127.0.0.1') ? 'http' : 'https';
		return `${protocol}://${appDomain}`;
	}

	const walletUrl = $derived.by(() => getWalletUrl());
	const appUrl = $derived.by(() => getAppUrl());
	
	// Determine CTA text and href based on auth status
	const ctaText = $derived.by(() => {
		if ($session.data?.user) {
			return 'Go To App';
		}
		return 'Sign up to waitlist now';
	});
	
	const ctaHref = $derived.by(() => {
		if ($session.data?.user) {
			return appUrl;
		}
		return walletUrl;
	});
</script>

<Favicon />

<div class="min-h-screen bg-glass-gradient flex flex-col font-sans">
	
	{@render children()}
	
	<Footer />
	
	<!-- NavPill with CTA state - shows "Open App" when logged in, "Sign up" when not -->
	<NavPill 
		pillState="cta"
		ctaText={ctaText}
		ctaHref={ctaHref}
		showLoginButton={!$session.data?.user}
	/>
</div>

