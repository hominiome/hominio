<script lang="ts">
	import { onMount } from 'svelte';
	import { createAuthClient } from '@hominio/auth';
	import { goto } from '$app/navigation';
	import { BackgroundBlobs, GlassCard, GlassButton, GlassInfoCard, LoadingSpinner, Alert, ProfileImage } from '@hominio/brand';
	import type { Capability } from '@hominio/caps';

	const authClient = createAuthClient();
	const session = authClient.useSession();

	let loading = $state(true);
	let error = $state<string | null>(null);
	let signingOut = $state(false);
	
	let capabilities = $state<Capability[]>([]);
	let capabilitiesLoading = $state(true);
	let capabilitiesError = $state<string | null>(null);

	$effect(() => {
		// Handle session state changes
		if ($session.isPending) {
			return;
		}
		
		if (!$session.data?.user) {
			loading = false;
			goto('/?callback=' + encodeURIComponent(window.location.href));
			return;
		}
		
		loading = false;
		
		// Load capabilities when session is ready
		if ($session.data?.user && capabilitiesLoading && capabilities.length === 0 && !capabilitiesError) {
			loadCapabilities();
		}
	});

	async function handleSignOut() {
		signingOut = true;
		try {
			await authClient.signOut();
			// Redirect to sign-in page
			goto('/');
		} catch (error) {
			console.error('Sign out error:', error);
			signingOut = false;
		}
	}

	async function loadCapabilities() {
		try {
			capabilitiesLoading = true;
			capabilitiesError = null;
			
			console.log('[Profile] Loading capabilities...');
			const response = await fetch('/api/auth/capabilities', {
				credentials: 'include',
			});
			
			console.log('[Profile] Capabilities response status:', response.status);
			
			if (!response.ok) {
				const errorText = await response.text();
				console.error('[Profile] Capabilities API error:', response.status, errorText);
				throw new Error(`Failed to load capabilities: ${response.status} ${errorText}`);
			}
			
			const data = await response.json();
			console.log('[Profile] Capabilities data:', data);
			capabilities = data.capabilities || [];
			console.log('[Profile] Loaded capabilities count:', capabilities.length);
		} catch (err) {
			console.error('[Profile] Error loading capabilities:', err);
			capabilitiesError = err instanceof Error ? err.message : 'Failed to load capabilities';
		} finally {
			capabilitiesLoading = false;
		}
	}

	// Capabilities will be loaded automatically when session is ready via $effect

	// Format resource string for display
	function formatResource(capability: Capability): string {
		const { resource } = capability;
		let resourceStr = `${resource.type}:${resource.namespace}`;
		if (resource.id) {
			resourceStr += `:${resource.id}`;
		}
		if (resource.device_id) {
			resourceStr += ` (device: ${resource.device_id})`;
		}
		return resourceStr;
	}
</script>

<div class="min-h-screen bg-glass-gradient p-6 font-sans text-slate-800 antialiased selection:bg-blue-100">
	<BackgroundBlobs />

	<div class="relative mx-auto max-w-2xl pt-12">
		{#if loading || $session.isPending}
			<div class="flex flex-col items-center justify-center py-24">
				<LoadingSpinner />
				<p class="mt-4 text-sm font-medium text-slate-500">Loading profile...</p>
			</div>
		{:else if error}
			<Alert type="error">
				<p class="font-medium">Error</p>
				<p class="text-sm opacity-80">{error}</p>
			</Alert>
		{:else if $session.data?.user}
			<!-- Header -->
			<div class="mb-8 text-center md:text-left">
				<h1 class="text-4xl font-bold tracking-tight text-slate-900">Profile</h1>
				<p class="mt-2 text-slate-500">Manage your account details</p>
			</div>
			
			<!-- Liquid Glass Card -->
			<GlassCard hover={true}>
				<!-- Custom taller gradient header for floating profile image -->
				<div class="h-32 w-full bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 opacity-50"></div>
				
				<div class="relative px-8 pb-10">
					<!-- Profile Image (Floating) -->
					<div class="-mt-16 mb-6 flex justify-center">
						<ProfileImage
							src={$session.data.user.image}
							name={$session.data.user.name || ''}
							email={$session.data.user.email || ''}
							size="lg"
						/>
					</div>

					<!-- User Info -->
					<div class="text-center">
						<h2 class="text-3xl font-bold text-slate-900">
							{$session.data.user.name || 'Anonymous User'}
						</h2>
						<div class="mt-1 text-lg font-medium text-slate-500">
							{$session.data.user.email || 'No email provided'}
						</div>

					<!-- ID Card - Full Width -->
					<div class="mt-8">
						<GlassInfoCard>
							<div class="flex items-center justify-between gap-4">
								<span class="text-sm font-semibold uppercase tracking-wider text-slate-400">ID</span>
								<span class="font-mono text-sm text-slate-700 break-all text-right">{$session.data.user.id}</span>
							</div>
						</GlassInfoCard>
					</div>

						<!-- Logout Button -->
						<div class="mt-8 flex justify-center">
							<GlassButton variant="danger" onclick={handleSignOut} disabled={signingOut} class="items-center gap-2">
								{#if signingOut}
									<div class="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600"></div>
									<span>Signing out...</span>
								{:else}
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
									</svg>
									<span>Sign Out</span>
								{/if}
							</GlassButton>
						</div>
					</div>
				</div>
			</GlassCard>

			<!-- Capabilities Section -->
			<div class="mt-12">
				<h2 class="mb-6 text-3xl font-bold tracking-tight text-slate-900">My Capabilities</h2>
				
				{#if capabilitiesLoading}
					<div class="flex items-center justify-center py-12">
						<LoadingSpinner />
						<p class="ml-4 text-sm font-medium text-slate-500">Loading capabilities...</p>
					</div>
				{:else if capabilitiesError}
					<GlassCard class="p-6">
						<div class="text-center text-red-600">
							<p class="font-medium">Error loading capabilities</p>
							<p class="mt-2 text-sm text-slate-500">{capabilitiesError}</p>
						</div>
					</GlassCard>
				{:else if capabilities.length === 0}
					<GlassCard class="p-8 text-center">
						<p class="text-slate-600">No capabilities granted yet.</p>
					</GlassCard>
				{:else}
					<div class="grid gap-4 md:grid-cols-2">
						{#each capabilities as capability (capability.id)}
							<GlassCard class="p-6">
								<div class="space-y-3">
									<div>
										<span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Resource</span>
										<p class="mt-1 font-mono text-sm text-slate-900 break-all">{formatResource(capability)}</p>
									</div>
									<div>
										<span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</span>
										<div class="mt-1 flex flex-wrap gap-2">
											{#each capability.actions as action}
												<span class="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
													{action}
												</span>
											{/each}
										</div>
									</div>
									{#if capability.conditions?.expiresAt}
										<div>
											<span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Expires</span>
											<p class="mt-1 text-sm text-slate-600">
												{new Date(capability.conditions.expiresAt).toLocaleDateString('de-DE', { 
													year: 'numeric', 
													month: 'long', 
													day: 'numeric' 
												})}
											</p>
										</div>
									{/if}
									<div class="pt-2 text-xs text-slate-400">
										Granted {new Date(capability.created_at).toLocaleDateString('de-DE')}
									</div>
								</div>
							</GlassCard>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
