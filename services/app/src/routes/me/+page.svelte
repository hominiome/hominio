<script>
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';

	/** @type {Array<{id: string, title: string, description: string | null, createdAt: string, userId: string}>} */
	let projects = $state([]);
	let loading = $state(true);
	/** @type {string | null} */
	let error = $state(null);

	// Get API URL from environment or default to localhost:4204
	function getApiUrl() {
		const apiDomain = env.PUBLIC_DOMAIN_API || 'localhost:4204';
		const protocol = apiDomain.startsWith('localhost') || apiDomain.startsWith('127.0.0.1') ? 'http' : 'https';
		return `${protocol}://${apiDomain}`;
	}

	async function fetchProjects() {
		loading = true;
		error = null;
		try {
			const apiUrl = getApiUrl();
			const response = await fetch(`${apiUrl}/api/v0/projects`, {
				credentials: 'include', // Include cookies for authentication
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch projects: ${response.statusText}`);
			}

			const data = await response.json();
			projects = data.projects || [];
		} catch (err) {
			console.error('Error fetching projects:', err);
			error = err instanceof Error ? err.message : 'Failed to load projects';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchProjects();
	});
</script>

<div
	class="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(3.5rem+env(safe-area-inset-bottom))] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.1)_0%,transparent_50%),radial-gradient(circle_at_70%_80%,rgba(251,191,36,0.08)_0%,transparent_50%)] before:content-['']"
>
	<div class="relative z-10 mb-12 pt-[env(safe-area-inset-top)] text-center text-white/95">
		<h1 class="mb-2 text-4xl font-bold tracking-tight md:text-5xl">My Projects</h1>
		<p class="text-base font-normal opacity-70">View and manage your projects</p>
	</div>

	{#if loading}
		<div class="relative z-10 flex flex-col items-center justify-center py-12">
			<div
				class="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-cyan-400"
			></div>
			<p class="m-0 text-base text-white/60">Loading projects...</p>
		</div>
	{:else if error}
		<div class="relative z-10 py-12 text-center">
			<p class="m-0 text-base text-yellow-400">{error}</p>
			<button
				onclick={fetchProjects}
				class="mt-4 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/90 transition-colors hover:bg-white/10"
			>
				Retry
			</button>
		</div>
	{:else if projects.length === 0}
		<div class="relative z-10 py-12 text-center text-base text-white/60">
			No projects found. Create your first project to get started!
		</div>
	{:else}
		<div class="relative z-10 mx-auto grid max-w-4xl grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:grid-cols-3">
			{#each projects as project (project.id)}
				<div
					class="relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-[16px] border border-white/10 bg-white/5 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-[20px] backdrop-saturate-[180%] transition-all duration-300 ease-out before:absolute before:top-0 before:right-0 before:left-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:content-[''] hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-white/8 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] active:translate-y-0"
					role="button"
					tabindex="0"
				>
					<div class="flex-1">
						<h2 class="mb-2 text-lg font-semibold tracking-tight text-white/95">
							{project.title}
						</h2>
						{#if project.description}
							<p class="mb-3 text-sm leading-relaxed text-white/60">
								{project.description}
							</p>
						{/if}
						<div class="mt-auto text-xs text-white/40">
							Created {new Date(project.createdAt).toLocaleDateString()}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

