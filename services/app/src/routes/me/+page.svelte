<script lang="ts">
	import { onMount } from 'svelte';
	import { getZeroContext } from '$lib/zero-utils';
	import { allProjects } from '@hominio/zero';
	import VoiceCall from '$lib/components/VoiceCall.svelte';

	/** @type {Array<{id: string, title: string, description: string | null, createdAt: string, userId: string}>} */
	let projects = $state([]);
	let loading = $state(true);
	/** @type {string | null} */
	let error = $state(null);

	// Get Zero context from layout
	const zeroContext = getZeroContext();

	onMount(() => {
		if (!zeroContext) {
			console.error('Zero context not found');
			loading = false;
			error = 'Zero sync is not available';
			return;
		}

		let projectsView: any;

		(async () => {
			// Wait for Zero to be ready
			while (!zeroContext.isReady() || !zeroContext.getInstance()) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
			const zero = zeroContext.getInstance();

			if (!zero) {
				loading = false;
				error = 'Failed to initialize Zero client';
				return;
	}

			try {
				// Query all projects using synced query - data is already cached locally!
				const projectsQuery = allProjects();
				projectsView = zero.materialize(projectsQuery);

				projectsView.addListener((data: any) => {
					const newProjects = Array.from(data || []);
					projects = newProjects;
					// Set loading to false IMMEDIATELY - ZeroDB data is already available locally
					loading = false;
					error = null;
				});
		} catch (err) {
				console.error('Error setting up Zero query:', err);
			error = err instanceof Error ? err.message : 'Failed to load projects';
			loading = false;
		}
		})();

		return () => {
			if (projectsView) projectsView.destroy();
		};
	});
</script>

<div class="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-[#f8f9fa] via-[#f2f4f6] to-[#e9ecef] px-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
	<!-- Decorative background blobs -->
	<div class="fixed -top-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-blue-200/20 blur-3xl filter pointer-events-none"></div>
	<div class="fixed top-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-purple-200/20 blur-3xl filter pointer-events-none"></div>
	<div class="fixed -bottom-[20%] left-[20%] h-[500px] w-[500px] rounded-full bg-emerald-200/20 blur-3xl filter pointer-events-none"></div>

	<div class="relative z-10 mb-12 pt-[env(safe-area-inset-top)] text-center">
		<h1 class="mb-2 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">My Projects</h1>
		<p class="text-base font-normal text-slate-500">View and manage your projects</p>
	</div>

	{#if loading}
		<div class="relative z-10 flex flex-col items-center justify-center py-12">
			<div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800"></div>
			<p class="mt-4 text-sm font-medium text-slate-500">Loading projects...</p>
		</div>
	{:else if error}
		<div class="relative z-10 py-12 text-center">
			<div class="mx-auto max-w-md rounded-2xl border border-yellow-100 bg-yellow-50/50 p-6 text-yellow-600 backdrop-blur-md">
				<p class="font-medium">Error</p>
				<p class="mt-1 text-sm opacity-80">{error}</p>
			</div>
		</div>
	{:else if projects.length === 0}
		<div class="relative z-10 py-12 text-center">
			<div class="mx-auto max-w-md rounded-2xl border border-white/60 bg-white/40 p-8 backdrop-blur-xl">
				<p class="text-base text-slate-500">No projects found. Create your first project to get started!</p>
			</div>
		</div>
	{:else}
		<div class="relative z-10 mx-auto grid max-w-4xl grid-cols-1 gap-6 px-4 md:grid-cols-2 lg:grid-cols-3">
			{#each projects as project (project.id)}
				<div
					class="group relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-3xl border border-white/60 bg-white/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/80 hover:bg-white/50 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] active:translate-y-0"
					role="button"
					tabindex="0"
				>
					<div class="flex-1">
						<h2 class="mb-2 text-lg font-semibold tracking-tight text-slate-900">
							{project.title}
						</h2>
						{#if project.description}
							<p class="mb-3 text-sm leading-relaxed text-slate-600">
								{project.description}
							</p>
						{/if}
						<div class="mt-auto text-xs text-slate-400">
							Created {new Date(project.createdAt).toLocaleDateString()}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Voice Call Component -->
	<div class="relative z-10 mx-auto mt-12 max-w-2xl px-4">
		<VoiceCall />
	</div>
</div>

