<script lang="ts">
	import '@hominio/brand/app.css';
	import { createAuthClient } from '@hominio/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { NavPill, createVoiceCallService, Favicon, Footer } from '@hominio/brand';
	
	let { children } = $props();
	
	const authClient = createAuthClient();
	const session = authClient.useSession();
	
	// Initialize voice call service with tool call handler
	const voiceCall = createVoiceCallService({
		onToolCall: (toolName, args) => {
			console.log('[NavPill] Tool call:', toolName, args);
			// Wallet service doesn't handle agent switching
			// Could add other tool handlers here if needed
		}
	});

	$effect(() => {
		// Skip protection for root route (/)
		if ($page.url.pathname === '/') {
			return;
		}

		// Protect all other routes - redirect to sign-in if not authenticated
		if (!$session.isPending && !$session.data?.user) {
			goto('/?callback=' + encodeURIComponent(window.location.href));
		}
	});

	// NavPill handlers
	function goHome() {
		goto('/');
	}

	let signingOut = $state(false);

	async function handleSignOut() {
		signingOut = true;
		try {
			await authClient.signOut();
			// Redirect to root (sign-in page)
			goto('/');
		} catch (error) {
			console.error('Sign out error:', error);
			signingOut = false;
		}
	}

	function handleGoogleSignIn() {
		// Redirect to Google sign-in (handled by root page)
		const currentUrl = window.location.href;
		goto('/?callback=' + encodeURIComponent(currentUrl));
	}

	// Voice call handlers - Using actual voice call service
	async function handleStartCall() {
		await voiceCall.startCall();
	}

	async function handleStopCall() {
		voiceCall.endCall();
	}

	// Ensure authentication state is properly reactive
	const isAuthenticated = $derived(!!$session.data?.user);
	const user = $derived($session.data?.user);
	
	// Get app service URL
	function getAppUrl() {
		if (typeof window === 'undefined') return '/';
		
		const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.0.0.1');
		const env = import.meta.env;
		let appDomain = env.PUBLIC_DOMAIN_APP;
		
		if (!appDomain) {
			if (isProduction) {
				const hostname = window.location.hostname;
				if (hostname.startsWith('wallet.')) {
					appDomain = hostname.replace('wallet.', 'app.');
				} else if (hostname.startsWith('www.')) {
					appDomain = `app.${hostname.replace('www.', '')}`;
				} else {
					appDomain = `app.${hostname}`;
				}
			} else {
				appDomain = 'localhost:4202';
			}
		}
		
		appDomain = appDomain.replace(/^https?:\/\//, '');
		const protocol = appDomain.startsWith('localhost') || appDomain.startsWith('127.0.0.1') ? 'http' : 'https';
		return `${protocol}://${appDomain}/me`;
	}

	// Get wallet service URL
	function getWalletUrl() {
		if (typeof window === 'undefined') return '/';
		
		const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.0.0.1');
		const env = import.meta.env;
		let walletDomain = env.PUBLIC_DOMAIN_WALLET;
		
		if (!walletDomain) {
			if (isProduction) {
				const hostname = window.location.hostname;
				if (hostname.startsWith('app.')) {
					walletDomain = hostname.replace('app.', 'wallet.');
				} else if (hostname.startsWith('www.')) {
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

	const appUrl = $derived.by(() => getAppUrl());
	const walletUrl = $derived.by(() => getWalletUrl());
	
	// Determine CTA text and href based on auth status
	const ctaText = $derived.by(() => {
		if (isAuthenticated) {
			return 'Open App';
		}
		return 'Sign up to waitlist now';
	});
	
	const ctaHref = $derived.by(() => {
		if (isAuthenticated) {
			return appUrl;
		}
		return walletUrl;
	});
	
	// Determine pill state based on auth status
	const pillState = $derived.by(() => {
		// Hide NavPill on root route when not authenticated (has separate sign-in form)
		if ($page.url.pathname === '/' && !isAuthenticated) {
			return 'hidden';
		}
		// When logged in, show CTA state with "Open App" button
		if (isAuthenticated) {
			return 'cta';
		}
		// When not logged in (and not on root), show default sign-in button
		return 'default';
	});
	
	// Debug: Log authentication state changes
	$effect(() => {
		console.log('[NavPill] Auth state changed:', { isAuthenticated, user: user?.name, pillState });
	});
</script>

<Favicon />

<NavPill 
	onHome={goHome}
	onSignOut={handleSignOut}
	onGoogleSignIn={handleGoogleSignIn}
	isAuthenticated={isAuthenticated}
	signingOut={signingOut}
	user={user}
	isCallActive={voiceCall.isCallActive}
	isConnecting={voiceCall.isConnecting}
	isWaitingForPermission={voiceCall.isWaitingForPermission}
	aiState={voiceCall.aiState}
	onStartCall={handleStartCall}
	onStopCall={handleStopCall}
	pillState={pillState}
	ctaText={ctaText}
	ctaHref={ctaHref}
	showLoginButton={!isAuthenticated}
/>

{@render children()}

<Footer />
